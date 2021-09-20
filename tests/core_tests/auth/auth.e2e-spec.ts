import {INestApplication} from "@nestjs/common";
import {getRepositoryToken} from "@nestjs/typeorm";
import {Test} from "@nestjs/testing";
import UsersModule from "../../../src/users/users.module";
import AuthModule from "../../../src/auth/auth.module";
import TestDatabaseModule from "../../database/test-database.module";
import User from "../../../src/users/user.entity";
import { Repository } from "typeorm";
import { mockedAuthGuard } from "../../common/mocked-auth-guard";
import { HttpExceptionFilter } from "../../../src/common/http-error.filter";
import { TestQueryExceptionFilter } from "../../common/test-query-error.filter";
import AuthHelper from "../../helpers/AuthHelper";
import RegisterUserDto from "../../../src/auth/dto/register-user.dto";
import EditUserDto from "../../../src/users/dto/edit-user.dto";
import { JwtAuthUserGuard } from "../../../src/auth/guards/jwt-auth-user.guard";
import { JwtAuthGuard } from "../../../src/auth/guards/jwt-auth.guard";

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

    describe("Scenario 1", () => {
        const userAJWT = "user_a_id";
        const userBJWT = "user_b_id";
        const userARegisterDto = new RegisterUserDto({
            username: "UserA",
            email: "userA@ipsum.fr"
        });
        const userBRegisterDto = new RegisterUserDto({
            email: "userB@ipsum.fr"
        });
        const userAEditDto = new EditUserDto({
            username: "UserAUpdated"
        })
        let userAID: string;

        it("1) Register user with username", async () => {
            const registerResult = await AuthHelper.registerClient(app, userAJWT, userARegisterDto);
            expect(registerResult.status).toBe(201);
            expect(registerResult.body).toEqual({
                ...userARegisterDto,
                id: expect.any(String),
                created_at: expect.any(String),
                updated_at: expect.any(String)
            });
            //Check a user has been inserted
            let allUsers = await userRepository.find();
            expect(allUsers.length).toBe(1);
    
            //Check the actual user is the good one
            userAID = registerResult.body.id;
            const foundUser = await userRepository.findOne(userAID);
            expect(foundUser).not.toBeNull();
        });

        it("2) Register user without username", async () => {
            const registerResult = await AuthHelper.registerClient(app, userBJWT, userBRegisterDto);
            expect(registerResult.status).toBe(201);
            expect(registerResult.body).toEqual({
                email: userBRegisterDto.email,
                username: null,
                id: expect.any(String),
                created_at: expect.any(String),
                updated_at: expect.any(String)
            });
            //Check a user has been inserted
            let allUsers = await userRepository.find();
            expect(allUsers.length).toBe(2);
        });

        it("3) Get user profile", async () => {
            let allUsers = await userRepository.find();
            expect(allUsers.length).toBe(2);
            const getProfileResult = await AuthHelper.getProfile(app, userAID);
            expect(getProfileResult.status).toBe(200);
            expect(getProfileResult.body).toEqual({
                ...userARegisterDto,
                id: userAID,
                created_at: expect.any(String),
                updated_at: expect.any(String)
            })
        });

        it("4) Update user profile", async () => {
            const updateProfileResult = await AuthHelper.updateProfile(app, userAID, userAEditDto);
            expect(updateProfileResult.status).toBe(200);
            expect(updateProfileResult.body).toEqual({
                email: userARegisterDto.email,
                username: userAEditDto.username,
                id: userAID,
                created_at: expect.any(String),
                updated_at: expect.any(String)
            });
        });

        it("5) Get updated user profile", async () => {
            const getProfileResult = await AuthHelper.getProfile(app, userAID);
            expect(getProfileResult.status).toBe(200);
            expect(getProfileResult.body).toEqual({
                email: userARegisterDto.email,
                username: userAEditDto.username,
                id: userAID,
                created_at: expect.any(String),
                updated_at: expect.any(String)
            })
        });
    });
});