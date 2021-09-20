import {Test} from "@nestjs/testing";
import {INestApplication} from "@nestjs/common";
import {getRepositoryToken} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import TestDatabaseModule from "../../database/test-database.module";
import {HttpExceptionFilter} from "../../../src/common/http-error.filter";
import {TestQueryExceptionFilter} from "../../common/test-query-error.filter";
import UsersModule from "../../../src/users/users.module";
import User from "../../../src/users/user.entity";
import {mockedAuthGuard} from "../../common/mocked-auth-guard";
import {JwtAuthUserGuard} from "../../../src/auth/guards/jwt-auth-user.guard";
import * as request from "supertest";

describe("User", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        UsersModule,
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
      .compile();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();
  });

  beforeEach(async () => {
    await userRepository.clear();
  });

  afterAll(async () => {
    await userRepository.clear();
    await app.close();
  });

  describe("Not authenticated user", () => {
    it("Should throw an UnauthorizedException", async () => {
      const response = await request(app.getHttpServer())
        .get("/users/me")
        .expect(401);
      expect(response.status).toBe(401);
    });

    it("Should throw an UnauthorizedException when trying to PATCH", async () => {
      const response = await request(app.getHttpServer())
        .patch("/users/me")
        .expect(401);
      expect(response.status).toBe(401);
    });
  });

  describe("Authenticated user", () => {
    /// Populate the `users` table
    async function populateUsers() {
      const user1 = new User("user_1_id", "user_1_username");
      user1.email = "user_1@email.com";
      const user2 = new User("user_2_id", "user_2_username");
      user2.email = "user_2@email.com";
      const user3 = new User("user_3_id", "user_3_username");
      user3.email = "user_3@email.com";
      await userRepository.save([user1, user2, user3]);
    }

    it("Should return the authenticated user", async () => {
      await populateUsers();

      const authenticatedUserId = "user_2_id";

      const user = await request(app.getHttpServer())
        .get("/users/me")
        .auth("fake.jwt", {type: "bearer"})
        .set("mocked_user_id", authenticatedUserId); // override the mocked userId decoded from the JWT

      expect(user.status).toBeGreaterThanOrEqual(200);
      expect(user.body).toEqual({
        id: expect.any(String),
        username: expect.any(String),
        email: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
      expect(user.body.id).toEqual(authenticatedUserId);
    });

    it("Should return the edited user", async () => {
      await populateUsers();

      const authenticatedUserId = "user_1_id";
      const newUsername = "new username of user1";

      // Get the current user
      const currentUser = await request(app.getHttpServer())
        .get("/users/me")
        .auth("fake.jwt", {type: "bearer"})
        .set("mocked_user_id", authenticatedUserId);
      expect(currentUser.status).toEqual(200);

      // Then edit its username
      const editedUser = await request(app.getHttpServer())
        .patch("/users/me")
        .auth("fake.jwt", {type: "bearer"})
        .set("mocked_user_id", authenticatedUserId)
        .send({username: newUsername});

      expect(editedUser.status).toEqual(200);
      expect(editedUser.body).toEqual({
        id: expect.any(String),
        username: expect.any(String),
        email: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
      expect(editedUser.body.id).toEqual(authenticatedUserId);
      expect(editedUser.body.username).not.toEqual(currentUser.body.username);
      expect(editedUser.body.username).toEqual(newUsername);

      const editionDate = Date.parse(editedUser.body.updated_at);
      const previousUserEditionDate = Date.parse(currentUser.body.updated_at);
      expect(editionDate).not.toEqual(previousUserEditionDate);
      expect(editedUser.body.created_at).toEqual(currentUser.body.created_at);
    });
  });
});