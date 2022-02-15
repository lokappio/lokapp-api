import {INestApplication} from "@nestjs/common";
import {getRepositoryToken} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {HttpExceptionFilter} from "../../src/common/http-error.filter";
import {TestQueryExceptionFilter} from "../common/test-query-error.filter";
import User from "../../src/users/user.entity";
import {mockedAuthGuard} from "../common/mocked-auth-guard";
import {JwtAuthUserGuard} from "../../src/auth/guards/jwt-auth-user.guard";
import * as request from "supertest";
import TestsHelpers from "../helpers/tests.helpers";
import EditUserDto from "../../src/users/dto/edit-user.dto";

describe("User", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const moduleRef = await TestsHelpers.getTestingModule()
      .overrideGuard(JwtAuthUserGuard)
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

  describe("Getting user", () => {
    beforeAll(async () => {
      await TestsHelpers.populateUsers(userRepository);
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
      const resp = await request(app.getHttpServer())
        .get("/users/me")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", "unexisting_user_id");
      expect(resp.status).toEqual(404);
    });

    it("Get another user profile", async () => {
      // Check there are at least 2 users in database
      const allUsers = await userRepository.find();
      expect(allUsers.length).toBeGreaterThanOrEqual(2);

      // Then try to access the other user's profile with its id.
      // Route does not exist. Should get a 404
      const result = await request(app.getHttpServer())
        .get("/users/" + TestsHelpers.MOCKED_USER_ID_2)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(result.status).toBe(404);
    });

    it("Get user profile", async () => {
      const allUsers = await userRepository.find();
      expect(allUsers.length).toBeGreaterThanOrEqual(1);

      const getProfileResult = await request(app.getHttpServer())
        .get("/users/me")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);

      expect(getProfileResult.status).toBe(200);
      expect(getProfileResult.body.id).toEqual(TestsHelpers.MOCKED_USER_ID_1);
      expect(getProfileResult.body.username).toEqual("username #1");
      expect(getProfileResult.body.email).toEqual("user_a@lokapp.io");
    });

    afterAll(async () => {
      await userRepository.clear();
    });
  });

  describe("Updating user", () => {
    beforeAll(async () => {
      await TestsHelpers.populateUsers(userRepository);
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
      const updateProfileResult = await request(app.getHttpServer())
        .patch("/users/me")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(updateDto);

      expect(updateProfileResult.status).toBe(200);
      expect(updateProfileResult.body.id).toEqual(TestsHelpers.MOCKED_USER_ID_1);
      expect(updateProfileResult.body.username).not.toEqual("username #1");
      expect(updateProfileResult.body.username).toEqual(updateDto.username);

      const getProfileResult = await request(app.getHttpServer())
        .get("/users/me")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(getProfileResult.status).toBe(200);
      expect(getProfileResult.body.id).toEqual(TestsHelpers.MOCKED_USER_ID_1);
      expect(getProfileResult.body.username).not.toEqual("username #1");
      expect(getProfileResult.body.username).toEqual(updateDto.username);
    });

    it("Prevent from editing user email ", async () => {
      const updateProfileResult = await request(app.getHttpServer())
        .patch("/users/me")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({email: "new_email@lokapp.io"});

      expect(updateProfileResult.status).toBe(400);
    });

    afterAll(async () => {
      await userRepository.clear();
    });
  });
});