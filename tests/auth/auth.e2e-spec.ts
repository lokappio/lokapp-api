import {INestApplication} from "@nestjs/common";
import {getRepositoryToken} from "@nestjs/typeorm";
import User from "../../src/users/user.entity";
import {Repository} from "typeorm";
import {mockedAuthGuard} from "../common/mocked-auth-guard";
import {HttpExceptionFilter} from "../../src/common/http-error.filter";
import {TestQueryExceptionFilter} from "../common/test-query-error.filter";
import AuthTestsHelpers from "./auth-tests.helpers";
import RegisterUserDto from "../../src/auth/dto/register-user.dto";
import {JwtAuthUserGuard} from "../../src/auth/guards/jwt-auth-user.guard";
import {JwtAuthGuard} from "../../src/auth/guards/jwt-auth.guard";
import * as request from "supertest";
import TestsHelpers from "../helpers/tests.helpers";

describe("Auth", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const moduleRef = await TestsHelpers.getTestingModule()
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
});