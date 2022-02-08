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
import Project from "../../../src/projects/project.entity";
import UserProject from "../../../src/users-projects/user_project.entity";
import AuthHelper from "../../helpers/AuthHelper";
import ProjectHelper from "../../helpers/ProjectHelper";
import ProjectsModule from "../../../src/projects/projects.module";
import CreateProjectDto from "../../../src/projects/dto/create-project.dto";
import UpdateProjectDto from "../../../src/projects/dto/update-project.dto";

describe("Projects E2E", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;

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

  describe("Creating project", () => {
    beforeAll(async () => {
      // Insert user in database before each test
      const userA = new User("mocked_user_id_1", "username one");
      userA.email = "userA@email.com";
      await userRepository.save(userA);
    });

    it("Get empty list of projects", async () => {
      const projectsResp = await ProjectHelper.getProjectsOfUser(app, "mocked_user_id_1");
      expect(projectsResp.status).toBe(200);
      expect(projectsResp.body.length).toBe(0);
    });
  });
  // TODO refactor tests
  // Virer les core et les edges tests. Tout mettre dans un seul fichier

  // Creating project
  // 401 / 422 / 201 ok créé

  // Getting project
  // 401 / 403 (not mine) / 404 not found
  // 200 ok avec 0 projet
  // 200 ok avec plusieurs projet
  // 200 ok getting details

  // Updating
  // 401 / 403 / 404 / 200 ok

  // Deleting project
  // 401 403 404 204

  describe("Projects E2E", () => {
    const userA = new User("mocked_user_id_1", "username one");
    userA.email = "userA@email.com";

    const projectACreateDto = new CreateProjectDto({
      name: "ProjectA",
      color: "121212",
      description: "Lorem ipsum"
    });

    beforeAll(async () => {
      // Insert user in database before each test
      await userRepository.save(userA);
    });

    it("Get empty list of projects", async () => {
      const projectsResp = await ProjectHelper.getProjectsOfUser(app, "mocked_user_id_1");
      expect(projectsResp.status).toBe(200);
      expect(projectsResp.body.length).toBe(0);
    });

    it("Get project after creating it", async () => {
      // Create a project
      const createdProjectResp = await ProjectHelper.createProject(app, "mocked_user_id_1", projectACreateDto);
      expect(createdProjectResp.status).toBe(201);
      expect(createdProjectResp.body).toEqual({
        ...projectACreateDto,
        id: expect.any(Number),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });

      // Get list of projects
      const projectsListResp = await ProjectHelper.getProjectsOfUser(app, "mocked_user_id_1");
      expect(projectsListResp.status).toBe(200);
      expect(projectsListResp.body.length).toBe(1);

      // Get project details
      const projectDetailsResp = await ProjectHelper.getProject(app, "mocked_user_id_1", createdProjectResp.body.id);
      expect(projectDetailsResp.status).toBe(200);
      expect(projectDetailsResp.body).toEqual({
        ...projectACreateDto,
        id: createdProjectResp.body.id,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });

      // Find the project by its id
      const foundProject = await projectRepository.findOne(createdProjectResp.body.id);
      expect(foundProject).not.toBeNull();
    });

    it("Updating a project", async () => {
      // Create a project
      const createdProject = await ProjectHelper.createProject(app, "mocked_user_id_1", projectACreateDto);

      // Update it
      const projectAUpdateDto = new UpdateProjectDto({
        name: "UpdatedA",
        color: "000000",
        description: null
      });
      const updatedProjectResponse = await ProjectHelper.updateProject(app, "mocked_user_id_1", createdProject.body.id, projectAUpdateDto);
      expect(updatedProjectResponse.status).toBe(200);
      expect(updatedProjectResponse.body).toEqual({
        ...projectAUpdateDto,
        id: createdProject.body.id,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it("Deleting a project", async () => {
      // Create a project
      const createdProjectResp = await ProjectHelper.createProject(app, "mocked_user_id_1", new CreateProjectDto({
        name: "Temporary project",
        color: "FF0000",
        description: "Project about to be deleted"
      }));

      // Delete this project
      const deleteResult = await ProjectHelper.deleteProject(app, "mocked_user_id_1", createdProjectResp.body.id);
      expect(deleteResult.status).toBe(204);

      // Expect not to be able to find the project anymore
      const foundProject = await projectRepository.findOne(createdProjectResp.body.id);
      expect(foundProject).not.toBeNull();
    });
  });
});