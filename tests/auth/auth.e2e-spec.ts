import {INestApplication} from "@nestjs/common";
import {getRepositoryToken} from "@nestjs/typeorm";
import {Test} from "@nestjs/testing";
import UsersModule from "../../src/users/users.module";
import AuthModule from "../../src/auth/auth.module";
import TestDatabaseModule from "../database/test-database.module";
import User from "../../src/users/user.entity";
import {Repository} from "typeorm";
import {mockedAuthGuard} from "../common/mocked-auth-guard";
import {HttpExceptionFilter} from "../../src/common/http-error.filter";
import {TestQueryExceptionFilter} from "../common/test-query-error.filter";
import AuthTestsHelpers from "./auth-tests.helpers";
import RegisterUserDto from "../../src/auth/dto/register-user.dto";
import {JwtAuthUserGuard} from "../../src/auth/guards/jwt-auth-user.guard";
import {JwtAuthGuard} from "../../src/auth/guards/jwt-auth.guard";
import EditUserDto from "../../src/users/dto/edit-user.dto";
import * as request from "supertest";

describe("Auth", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        UsersModule,
        AuthModule,
        TestDatabaseModule
      ],
      providers: [
        {
          provide: getRepositoryToken(User),
          useClass: Repository
        }
      ]
    })
      .overrideGuard(JwtAuthUserGuard)
      .useValue(mockedAuthGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockedAuthGuard)
      .compile();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await userRepository.clear();
    await app.close();
  });

  describe("Registering user", () => {
    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send(new RegisterUserDto({
          username: "lorem ipsum",
          email: "user@lokapp.io"
        }));
      expect(response.status).toEqual(401);
    });

    it("Register with missing parameters", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .auth("mocked.jwt", {type: "bearer"})
        .send({});
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
    });

    it("Register user with username", async () => {
      const createUserDto = new RegisterUserDto({
        username: "UserA",
        email: "usera@lokapp.io"
      });
      const userID = "user_a_id";

      const registerResult = await AuthTestsHelpers.registerUser(app, userID, createUserDto);
      expect(registerResult.status).toBe(201);
      expect(registerResult.body).toEqual({
        ...createUserDto,
        id: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });

      // Check user has been inserted
      const allUsers = await userRepository.find();
      expect(allUsers.length).toBe(1);

      // Check user id
      const foundUser = await userRepository.findOne(userID);
      expect(foundUser).not.toBeNull();
      expect(registerResult.body.id).toEqual(userID);
    });

    it("Register user without username", async () => {
      const createUserDto = new RegisterUserDto({
        email: "userb@lokapp.io"
      });
      const userID = "user_b_id";

      const registerResult = await AuthTestsHelpers.registerUser(app, userID, createUserDto);
      expect(registerResult.status).toBe(201);
      expect(registerResult.body).toEqual({
        email: createUserDto.email,
        username: null,
        id: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });

      // Check user has been inserted
      const foundUser = await userRepository.findOne(userID);
      expect(foundUser).not.toBeNull();
      expect(registerResult.body.id).toEqual(userID);
    });

    it("User with provided email already exists", async () => {
      await request(app.getHttpServer())
        .post("/auth/register")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", "existing_user_id")
        .send({email: "existing.user@lokapp.io"});

      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", "another_user_id")
        .send({email: "existing.user@lokapp.io"});
      expect(response.status).toBe(422);
    });

    it("User with provided id already exists", async () => {
      await request(app.getHttpServer())
        .post("/auth/register")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", "duplicated_id")
        .send({email: "loremipsum@lokapp.io"});

      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", "duplicated_id")
        .send({email: "example@lokapp.io"});
      expect(response.status).toEqual(400);
    });

    afterAll(async () => {
      await userRepository.clear();
    });
  });

  describe("Getting user", () => {
    beforeAll(async () => {
      // Before all test, insert a user in database
      const user = new User("new_user_id", "New user");
      user.email = "new_user@lokapp.io";
      await userRepository.save(user);
    });

    it("Unauthenticated user (without JWT)", async () => {
      const resp = await request(app.getHttpServer())
        .get("/users/me");
      expect(resp.status).toEqual(401);
    });

    it("No userId decoded from the JWT", async () => {
      const resp = await request(app.getHttpServer())
        .get("/users/me")
        .auth("mocked.jwt", {type: "bearer"});
      expect(resp.status).toEqual(404);
    });

    it("Unregistered user", async () => {
      const response = await AuthTestsHelpers.getCurrentUserProfile(app, "wrong_user_id");
      expect(response.status).toEqual(404);
    });

    it("Get another user profile", async () => {
      // Add another user in database
      const anotherUser = new User("another_id", "Lorem ipsum");
      anotherUser.email = "another_user@lokapp.io";
      await userRepository.save(anotherUser);
      // Check there are 2 users in database
      const allUsers = await userRepository.find();
      expect(allUsers.length).toBe(2);

      // Then try to access the other user's profile with its id.
      // Route does not exist. Should get a 404
      const result = await request(app.getHttpServer())
        .get("/users/another_id")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", "new_user_id");
      expect(result.status).toBe(404);
    });

    it("Get user profile", async () => {
      const allUsers = await userRepository.find();
      expect(allUsers.length).toBeGreaterThanOrEqual(1);

      const getProfileResult = await AuthTestsHelpers.getCurrentUserProfile(app, "new_user_id");
      expect(getProfileResult.status).toBe(200);
      expect(getProfileResult.body.id).toEqual("new_user_id");
      expect(getProfileResult.body.username).toEqual("New user");
      expect(getProfileResult.body.email).toEqual("new_user@lokapp.io");
    });

    afterAll(async () => {
      await userRepository.clear();
    });
  });

  describe("Updating user", () => {
    beforeAll(async () => {
      const user = new User("editable_user_id", "New user");
      user.email = "editable_user@lokapp.io";
      await userRepository.save(user);
    });

    it("Unauthenticated user (no JWT)", async () => {
      const editUserDto = new EditUserDto({username: "Edited username"});
      const response = await request(app.getHttpServer())
        .patch("/users/me")
        .send(editUserDto);
      expect(response.status).toEqual(401);
    });

    it("Edit user without userId decoded from token", async () => {
      const editUserDto = new EditUserDto({username: "Edited username"});
      const response = await request(app.getHttpServer())
        .patch("/users/me")
        .auth("mocked.jwt", {type: "bearer"})
        .send(editUserDto);
      expect(response.status).toEqual(404);
    });

    it("Editing profile without being registered", async () => {
      const editUserDto = new EditUserDto({username: "Edited username"});
      const response = await request(app.getHttpServer())
        .patch("/users/me")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", "wrong_user_id")
        .send(editUserDto);
      expect(response.status).toEqual(404);
    });

    it("Editing user", async () => {
      const updateDto = new EditUserDto({username: "Edited username"});
      const updateProfileResult = await AuthTestsHelpers.editCurrentUserProfile(app, "editable_user_id", updateDto);
      expect(updateProfileResult.status).toBe(200);
      expect(updateProfileResult.body.id).toEqual("editable_user_id");
      expect(updateProfileResult.body.email).toEqual("editable_user@lokapp.io");
      expect(updateProfileResult.body.username).not.toEqual("Editable user");
      expect(updateProfileResult.body.username).toEqual("Edited username");

      const getProfileResult = await AuthTestsHelpers.getCurrentUserProfile(app, "editable_user_id");
      expect(getProfileResult.status).toBe(200);
      expect(getProfileResult.body.id).toEqual("editable_user_id");
      expect(getProfileResult.body.username).not.toEqual("Editable user");
      expect(getProfileResult.body.username).toEqual("Edited username");
    });

    afterAll(async () => {
      await userRepository.clear();
    });
  });
});