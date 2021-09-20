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
import { JwtAuthUserGuard } from "../../../src/auth/guards/jwt-auth-user.guard";
import * as request from "supertest";
import Project from "../../../src/projects/project.entity";
import UserProject from "../../../src/users-projects/user_project.entity";
import AuthHelper from "../../helpers/AuthHelper";
import ProjectsModule from "../../../src/projects/projects.module";
import EdgeHelper from "../../helpers/EdgeHelper";
import ProjectHelper from "../../helpers/ProjectHelper";
import Role from "../../../src/roles/role.enum";
import Language from "../../../src/languages/language.entity";
import CreateLanguageDto from "../../../src/projects/dto/create-language.dto";
import LanguageHelper from "../../helpers/LanguageHelper";

describe("Language edge", () => {
    let app: INestApplication;
    let userRepository: Repository<User>;
    let projectRepository: Repository<Project>;
    let userProjectRepository: Repository<UserProject>;
    let languageRepository: Repository<Language>;

    const userAId = "user_1_ID";
    const userBId = "user_2_ID";

    const userA = new User(userAId, "userA");
    const userB = new User(userBId, "UserB");

    let projectId: number;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                UsersModule,
                AuthModule,
                ProjectsModule,
                TestDatabaseModule
            ],
            providers: [
                {
                    provide: getRepositoryToken(User),
                    useClass: Repository
                },
                {
                    provide: getRepositoryToken(Project),
                    useClass: Repository
                },
                {
                    provide: getRepositoryToken(UserProject),
                    useClass: Repository
                },
                {
                    provide: getRepositoryToken(Language),
                    useClass: Repository
                }
            ]
        })
        .overrideGuard(JwtAuthUserGuard)
        .useValue(mockedAuthGuard)
        .compile();

        userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
        projectRepository = moduleRef.get<Repository<Project>>(getRepositoryToken(Project));
        userProjectRepository = moduleRef.get<Repository<UserProject>>(getRepositoryToken(UserProject));
        languageRepository = moduleRef.get<Repository<Language>>(getRepositoryToken(Language));

        userA.email = "usera@email.com";
        userB.email = "userb@email.com";
        await AuthHelper.dbAddUser(userRepository, userA);
        await AuthHelper.dbAddUser(userRepository, userB);

        app = moduleRef.createNestApplication();
        app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
        await app.init();

        //Init tests
        let project = new Project();
        project.name = "project name";
        project.color = "FFFFFF";
        await ProjectHelper.dbAddProject(projectRepository, project);
        
        let relation = new UserProject();
        relation.user = userA;
        relation.project = project;
        relation.role = Role.Owner;
        await ProjectHelper.dbAddUserProjectRelation(userProjectRepository, relation);

        projectId = (await projectRepository.findOne({where: {name: project.name}})).id;
    });

    afterAll(async () => {
        await userRepository.clear();
        await projectRepository.clear();
        await userProjectRepository.clear();
        await languageRepository.clear();
        await app.close();
    });

    describe("Get every languages of project", () => {
        it("No JWT on request", async () => {
            const req = request(app.getHttpServer())
                .get(`/projects/${projectId}/languages`);
            await EdgeHelper.requestWithoutJWT(req);
        });

        it("Not existing projectId on request", async () => {
            const req = request(app.getHttpServer())
                .get(`/projects/123456/languages`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId);
            await EdgeHelper.entityNotFound(req);
        });

        it("Project not owned", async () => {
            const req = request(app.getHttpServer())
                .get(`/projects/${projectId}/languages`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userBId);
            await EdgeHelper.entityNotReachable(req);
        });
    });

    describe("Create language", () => {
        const createLanguageDto = new CreateLanguageDto({
            name: "language name"
        });

        it("No JWT on request", async () => {
            const req = request(app.getHttpServer())
                .post(`/projects/${projectId}/languages`)
                .send(createLanguageDto);
            await EdgeHelper.requestWithoutJWT(req);
        });

        it("Not existing projectId on request", async () => {
            const req = request(app.getHttpServer())
                .post(`/projects/123456/languages`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId)
                .send(createLanguageDto);
            await EdgeHelper.roleGuardError(req);
        });

        it("Project not owned", async () => {
            const req = request(app.getHttpServer())
                .post(`/projects/${projectId}/languages`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userBId)
                .send(createLanguageDto);
            await EdgeHelper.roleGuardError(req);
        });

        it("Invalid DTO on request", async () => {
            const req = request(app.getHttpServer())
                .post(`/projects/${projectId}/languages`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId)
            await EdgeHelper.requestWithInvalidDto(req);

            const req2 = request(app.getHttpServer())
                .post(`/projects/${projectId}/languages`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId)
                .send({});
            await EdgeHelper.requestWithInvalidDto(req2);

            const req3 = request(app.getHttpServer())
                .post(`/projects/${projectId}/languages`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId)
                .send({name: "Language Name With A Number Of Characters Greather Than 80 Characters Lorem Ipsum"});
            await EdgeHelper.requestWithInvalidDto(req3);
        });

        it("Language name already exists", async () => {
            const language = new Language();
            language.name = "Language";
            language.project = await projectRepository.findOne(projectId);
            await LanguageHelper.dbAddLanguage(languageRepository, language);
            
            const req = request(app.getHttpServer())
                .post(`/projects/${projectId}/languages`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId)
                .send({name: language.name});
            await EdgeHelper.entityAlreadyExists(req);
        });
    });

    describe("Get one language", () => {
        const language = new Language();
        let languageId: number;
        
        beforeAll(async () => {
            await languageRepository.clear();
            language.name = "Language";
            language.project = await projectRepository.findOne(projectId);
            await LanguageHelper.dbAddLanguage(languageRepository, language);
            languageId = (await languageRepository.findOne({where: {project: language.project}})).id;
        });

        it("No JWT on request", async () => {
            const req = request(app.getHttpServer())
                .get(`/projects/${projectId}/languages/${languageId}`);
            await EdgeHelper.requestWithoutJWT(req);
        });

        it("Not existing projectId on request", async () => {
            const req = request(app.getHttpServer())
                .get(`/projects/123456/languages/${languageId}`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId);
            await EdgeHelper.entityNotFound(req);
        });

        it("Project not owned", async () => {
            const req = request(app.getHttpServer())
                .get(`/projects/${projectId}/languages/${languageId}`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userBId);
            await EdgeHelper.entityNotReachable(req);
        });

        it("Language not found on project", async () => {
            const req = request(app.getHttpServer())
                .get(`/projects/${projectId}/languages/123456`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId);
            await EdgeHelper.entityNotFound(req);
        });
    });

    describe("Update language", () => {
        const language = new Language();
        let languageId: number;

        const udpateLanguageDto = new CreateLanguageDto({
            name: "updatedName"
        });
        
        beforeEach(async () => {
            await languageRepository.clear();
            language.name = "Language";
            language.project = await projectRepository.findOne(projectId);
            await LanguageHelper.dbAddLanguage(languageRepository, language);
            languageId = (await languageRepository.findOne({where: {project: language.project}})).id;
        });

        it("No JWT on request", async () => {
            const req = request(app.getHttpServer())
                .put(`/projects/${projectId}/languages/${languageId}`)
                .send(udpateLanguageDto);
            await EdgeHelper.requestWithoutJWT(req);
        });

        it("Not existing projectId on request", async () => {
            const req = request(app.getHttpServer())
                .put(`/projects/123456/languages/${languageId}`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId)
                .send(udpateLanguageDto);
            await EdgeHelper.roleGuardError(req);
        });

        it("Project not owned", async () => {
            const req = request(app.getHttpServer())
                .put(`/projects/${projectId}/languages/${languageId}`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userBId)
                .send(udpateLanguageDto);
            await EdgeHelper.roleGuardError(req);
        });

        it("Language not found on project", async () => {
            const req = request(app.getHttpServer())
                .put(`/projects/${projectId}/languages/123456`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId)
                .send(udpateLanguageDto);
            await EdgeHelper.entityNotFound(req);
        });

        it("Wrong DTO on request", async () => {
            const req = request(app.getHttpServer())
                .put(`/projects/${projectId}/languages/${languageId}`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId)
            await EdgeHelper.requestWithInvalidDto(req);

            const req2 = request(app.getHttpServer())
                .put(`/projects/${projectId}/languages/${languageId}`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId)
                .send({});
            await EdgeHelper.requestWithInvalidDto(req2);
        });

        it("Language name already exists", async () => {
            const language2 = new Language();
            language2.name = udpateLanguageDto.name;
            language2.project = await projectRepository.findOne(projectId);
            await LanguageHelper.dbAddLanguage(languageRepository, language2);

            const req = request(app.getHttpServer())
                .put(`/projects/${projectId}/languages/${languageId}`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId)
                .send(udpateLanguageDto);
            await EdgeHelper.entityAlreadyExists(req);
        });
    });

    describe("Delete language", () => {
        const language = new Language();
        let languageId: number;
        
        beforeEach(async () => {
            await languageRepository.clear();
            language.name = "Language";
            language.project = await projectRepository.findOne(projectId);
            await LanguageHelper.dbAddLanguage(languageRepository, language);
            languageId = (await languageRepository.findOne({where: {project: language.project}})).id;
        });

        it("No JWT on request", async () => {
            const req = request(app.getHttpServer())
                .delete(`/projects/${projectId}/languages/${languageId}`);
            await EdgeHelper.requestWithoutJWT(req);
        });

        it("Not existing projectId on request", async () => {
            const req = request(app.getHttpServer())
                .delete(`/projects/123456/languages/${languageId}`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId);
            await EdgeHelper.roleGuardError(req);
        });

        it("Project not owned", async () => {
            const req = request(app.getHttpServer())
                .delete(`/projects/${projectId}/languages/${languageId}`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userBId);
            await EdgeHelper.roleGuardError(req);
        });

        it("Language not found on project", async () => {
            const req = request(app.getHttpServer())
                .delete(`/projects/${projectId}/languages/123456`)
                .auth("mocked.jwt", {type: "bearer"})
                .set("mocked_user_id", userAId);
            await EdgeHelper.entityNotFound(req);
        });
    });
});