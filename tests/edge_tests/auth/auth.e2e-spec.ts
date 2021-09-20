import {INestApplication} from "@nestjs/common";
import {getRepositoryToken} from "@nestjs/typeorm";
import {Test} from "@nestjs/testing";
import UsersModule from "../../../src/users/users.module";
import AuthModule from "../../../src/auth/auth.module";
import TestDatabaseModule from "../../database/test-database.module";
import User from "../../../src/users/user.entity";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../../../src/auth/guards/jwt-auth.guard";
import { mockedAuthGuard } from "../../common/mocked-auth-guard";
import { HttpExceptionFilter } from "../../../src/common/http-error.filter";
import { TestQueryExceptionFilter } from "../../common/test-query-error.filter";
import EdgeHelper from "../../helpers/EdgeHelper";
import RegisterUserDto from "../../../src/auth/dto/register-user.dto";
import * as request from "supertest";
import AuthHelper from "../../helpers/AuthHelper";
import EditUserDto from "../../../src/users/dto/edit-user.dto";
import { JwtAuthUserGuard } from "../../../src/auth/guards/jwt-auth-user.guard";


describe("Edge Auth", () => {
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
        .overrideGuard(JwtAuthGuard)
        .useValue(mockedAuthGuard)
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

    describe("Register user", () => {
        const userARegisterDto = new RegisterUserDto({
            name: "userA",
            email: "userA@lipsum.com"
        });

        beforeEach(async () => {
            await userRepository.clear();
            const user = new User("existing_user_id", "existing_username");
            user.email = "existing.email@email.com";
            await AuthHelper.dbAddUser(userRepository, user);
        });

        it("No JWT on request", async () => {
            const req = request(app.getHttpServer())
                .post("/auth/register")
                .send(userARegisterDto);
            await EdgeHelper.requestWithoutJWT(req)
        });

        it("No email on request", async () => {
            const req = request(app.getHttpServer())
                .post("/auth/register")
                .auth("mocked.jwt", {type: "bearer"})
                .send({})
            await EdgeHelper.requestWithInvalidDto(req);
        });

        it("Email already used in database", async () => {
            const req = await request(app.getHttpServer())
                .post("/auth/register")
                .auth("mocked.jwt", {type: "bearer"})
                .send({email: "existing.email@email.com"});
            expect(req.status).toBe(422);
        });

        it("UserID already used in database", async() => {
            const req = await request(app.getHttpServer())
                .post("/auth/register")
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", "existing_user_id")
                .send(userARegisterDto);
            expect(req.status).toBe(400);
        });
    });

    describe("Get user profile", () => {
        beforeEach(async () => {
            await userRepository.clear();
            const user = new User("existing_user_id", "existing_username");
            user.email = "existing.email@email.com";
            await AuthHelper.dbAddUser(userRepository, user);
        });

        it("No JWT on request", async () => {
            const req = request(app.getHttpServer())
                .get("/users/me");
            await EdgeHelper.requestWithoutJWT(req)
        });

        it("No UserID on request", async () => {
            const req = request(app.getHttpServer())
                .get("/users/me")
                .auth("mocked.jwt", {type: "bearer"});
            await EdgeHelper.requestWithoutUserID(req)
        });

        it("UserId not registered on request", async () => {
            const req = request(app.getHttpServer())
                .get("/users/me")
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", "wrong_user_id");
            await EdgeHelper.requestWithInvalidUserID(req)
        });
    });

    describe("Update user profile", () => {
        const editUserDto = new EditUserDto({
            username: "userUpdated"
        });

        beforeEach(async () => {
            await userRepository.clear();
            const user1 = new User("user_id_1", "existing_username_1");
            user1.email = "user1.email@email.com";
            const user2 = new User("user_id_2", "existing_username_2");
            user2.email = "user2.email@email.com";
            await AuthHelper.dbAddUser(userRepository, user1);
            await AuthHelper.dbAddUser(userRepository, user2);
        });

        it("No JWT on request", async () => {
            const req = request(app.getHttpServer())
                .patch("/users/me")
                .send(editUserDto);
            await EdgeHelper.requestWithoutJWT(req)
        });

        it("No UserID on request", async () => {
            const req = request(app.getHttpServer())
                .patch("/users/me")
                .auth("mocked.jwt", {type: "bearer"})
                .send(editUserDto);
            await EdgeHelper.requestWithoutUserID(req)
        });

        it("UserId not registered on request", async () => {
            const req = request(app.getHttpServer())
                .patch("/users/me")
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", "wrong_user_id")
                .send(editUserDto);
            await EdgeHelper.requestWithInvalidUserID(req)
        });

        it("Number on username on request", async () => {
            const req = request(app.getHttpServer())
                .patch("/users/me")
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", "user_id_1")
                .send({username: 404});
            await EdgeHelper.requestWithInvalidDto(req);
        });
    });
});