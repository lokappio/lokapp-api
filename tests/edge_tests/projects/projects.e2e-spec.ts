import {INestApplication} from "@nestjs/common";
import {getRepositoryToken} from "@nestjs/typeorm";
import {Test} from "@nestjs/testing";
import UsersModule from "../../../src/users/users.module";
import AuthModule from "../../../src/auth/auth.module";
import TestDatabaseModule from "../../database/test-database.module";
import User from "../../../src/users/user.entity";
import {Repository} from "typeorm";
import {mockedAuthGuard} from "../../common/mocked-auth-guard";
import {HttpExceptionFilter} from "../../../src/common/http-error.filter";
import {TestQueryExceptionFilter} from "../../common/test-query-error.filter";
import {JwtAuthUserGuard} from "../../../src/auth/guards/jwt-auth-user.guard";
import * as request from "supertest";
import Project from "../../../src/projects/project.entity";
import UserProject from "../../../src/users-projects/user_project.entity";
import AuthHelper from "../../helpers/AuthHelper";
import ProjectsModule from "../../../src/projects/projects.module";
import EdgeHelper from "../../helpers/EdgeHelper";
import CreateProjectDto from "../../../src/projects/dto/create-project.dto";
import ProjectHelper from "../../helpers/ProjectHelper";
import Role from "../../../src/roles/role.enum";
import UpdateProjectDto from "../../../src/projects/dto/update-project.dto";

describe("Project edge", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;

  const userAId = "user_1_ID";
  const userBId = "user_2_ID";

  const userA = new User(userAId, "userA");
  const userB = new User(userBId, "UserB");

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
        }
      ]
    })
      .overrideGuard(JwtAuthUserGuard)
      .useValue(mockedAuthGuard)
      .compile();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    projectRepository = moduleRef.get<Repository<Project>>(getRepositoryToken(Project));
    userProjectRepository = moduleRef.get<Repository<UserProject>>(getRepositoryToken(UserProject));

    userA.email = "usera@email.com";
    userB.email = "userb@email.com";
    await AuthHelper.dbAddUser(userRepository, userA);
    await AuthHelper.dbAddUser(userRepository, userB);

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await app.close();
  });

  describe("Get every project of user", () => {
    beforeEach(async () => {
      await projectRepository.clear();
      await userProjectRepository.clear();
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .get("/projects");
      await EdgeHelper.requestWithoutJWT(req);
    });
  });

  describe("Create a project", () => {
    const projectCreateDto = new CreateProjectDto({
      name: "ProjectName",
      color: "FFFFFF"
    });

    beforeEach(async () => {
      await projectRepository.clear();
      await userProjectRepository.clear();
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .post("/projects")
        .send(projectCreateDto);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Wrong DTO on request", async () => {
      const req = request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({name: "Project name"});
      await EdgeHelper.requestWithInvalidDto(req);

      const req2 = request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({color: "FFFFFF"});
      await EdgeHelper.requestWithInvalidDto(req2);

      const req3 = request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.requestWithInvalidDto(req3);
    });
  });

  describe("Get one project", () => {
    const projectCreated = new Project();
    projectCreated.name = "project_name";
    projectCreated.color = "FFFFFF";

    const userProjectCreated = new UserProject();
    let projectId: number;

    beforeEach(async () => {
      await projectRepository.clear();
      await userProjectRepository.clear();
      await ProjectHelper.dbAddProject(projectRepository, projectCreated);
      const project = await projectRepository.findOne({
        where: {
          name: projectCreated.name
        }
      });
      projectId = project.id;
      userProjectCreated.project = project;
      userProjectCreated.userId = userAId;
      userProjectCreated.role = Role.Owner;
      await ProjectHelper.dbAddUserProjectRelation(userProjectRepository, userProjectCreated);
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${projectId}`);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${123456}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.entityNotFound(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId);
      await EdgeHelper.entityNotReachable(req);
    });
  });

  describe("Update project", () => {
    const projectCreated = new Project();
    projectCreated.name = "project_name";
    projectCreated.color = "FFFFFF";

    const userProjectCreated = new UserProject();
    let projectId: number;

    const projectUpdateDto = new UpdateProjectDto({
      name: "Updated project",
      color: "FFFFFF"
    });

    beforeEach(async () => {
      await projectRepository.clear();
      await userProjectRepository.clear();
      await ProjectHelper.dbAddProject(projectRepository, projectCreated);
      const project = await projectRepository.findOne({
        where: {
          name: projectCreated.name
        }
      });
      projectId = project.id;
      userProjectCreated.project = project;
      userProjectCreated.userId = userAId;
      userProjectCreated.role = Role.Owner;
      await ProjectHelper.dbAddUserProjectRelation(userProjectRepository, userProjectCreated);
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .put(`/projects/${projectId}`)
        .send(projectUpdateDto);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .put(`/projects/${123456}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(projectUpdateDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .put(`/projects/${projectId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId)
        .send(projectUpdateDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("Wrong DTO on request", async () => {
      const req = request(app.getHttpServer())
        .put(`/projects/${projectId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({name: "newName"});
      await EdgeHelper.requestWithInvalidDto(req);

      const req2 = request(app.getHttpServer())
        .put(`/projects/${projectId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({color: "FFFFFF"});
      await EdgeHelper.requestWithInvalidDto(req2);

      const req3 = request(app.getHttpServer())
        .put(`/projects/${projectId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({name: "newName", color: "oooooo"});
      await EdgeHelper.requestWithInvalidDto(req3);

      const req4 = request(app.getHttpServer())
        .put(`/projects/${projectId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({name: "newNamewithalengthgreaterthan80charactersnewNamewithalengthgreaterthan80characters", color: "FFFFFF"});
      await EdgeHelper.requestWithInvalidDto(req4);
    });
  });

  describe("Delete project", () => {
    const projectCreated = new Project();
    projectCreated.name = "project_name";
    projectCreated.color = "FFFFFF";

    const userProjectCreated = new UserProject();
    let projectId: number;

    beforeEach(async () => {
      await projectRepository.clear();
      await userProjectRepository.clear();
      await ProjectHelper.dbAddProject(projectRepository, projectCreated);
      const project = await projectRepository.findOne({
        where: {
          name: projectCreated.name
        }
      });
      projectId = project.id;
      userProjectCreated.project = project;
      userProjectCreated.userId = userAId;
      userProjectCreated.role = Role.Owner;
      await ProjectHelper.dbAddUserProjectRelation(userProjectRepository, userProjectCreated);
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectId}`);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${123456}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.roleGuardError(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId);
      await EdgeHelper.roleGuardError(req);
    });
  });
});