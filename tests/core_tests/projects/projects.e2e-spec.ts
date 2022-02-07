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
import Role from "../../../src/roles/role.enum";
import Group, {DefaultGroupName} from "../../../src/groups/group.entity";
import GroupModule from "../../../src/groups/group.module";
import GroupHelper from "../../helpers/GroupHelper";

describe("Project", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let groupRepository: Repository<Group>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        UsersModule,
        AuthModule,
        ProjectsModule,
        GroupModule,
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
          provide: getRepositoryToken(Group),
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
    groupRepository = moduleRef.get<Repository<Group>>(getRepositoryToken(Group));

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await groupRepository.clear();
    await app.close();
  });

  describe("Use case #1", () => {
    const userA = new User("mocked_user_id_1", "username one");
    userA.email = "userA@email.com";
    const projectACreateDto = new CreateProjectDto({
      name: "ProjectA",
      color: "FFFFFF",
      description: "Lorem ipsum"
    });
    const projectAUpdateDto = new UpdateProjectDto({
      name: "UpdatedA",
      color: "000000",
      description: null
    });
    let projectId: number;

    beforeAll(async () => {
      await AuthHelper.dbAddUser(userRepository, userA);
    });

    it("1) Get list of user's project", async () => {
      const getResult = await ProjectHelper.getProjectsOfUser(app, "mocked_user_id_1");
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(0);
    });

    it("2) User create project", async () => {
      const createResult = await ProjectHelper.createProject(app, "mocked_user_id_1", projectACreateDto);
      expect(createResult.status).toBe(201);
      expect(createResult.body).toEqual({
        ...projectACreateDto,
        id: expect.any(Number),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
      projectId = createResult.body.id;
    });

    it("3) Get list of user's project", async () => {
      const getResult = await ProjectHelper.getProjectsOfUser(app, "mocked_user_id_1");
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(1);
    });

    it("4) Get user project", async () => {
      const getResult = await ProjectHelper.getProject(app, "mocked_user_id_1", projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body).toEqual({
        ...projectACreateDto,
        id: projectId,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });

      const foundProject = await projectRepository.findOne(projectId);
      expect(foundProject).not.toBeNull();
    });

    it("4) Get user groups on project", async () => {
      const getResult = await GroupHelper.getGroups(app, "mocked_user_id_1", projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body).toEqual([
        {
          id: expect.any(Number),
          name: DefaultGroupName,
          created_at: expect.any(String),
          updated_at: expect.any(String)
        }
      ]);

      const foundGroup = await groupRepository.findOne({
        where: {
          project: {
            id: projectId
          }
        }
      });
      expect(foundGroup).not.toBeNull();
    });

    it("5) Update project", async () => {
      const updateResult = await ProjectHelper.updateProject(app, "mocked_user_id_1", projectId, projectAUpdateDto);
      expect(updateResult.status).toBe(200);
      expect(updateResult.body).toEqual({
        ...projectAUpdateDto,
        id: projectId,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it("6) Get user project", async () => {
      const getResult = await ProjectHelper.getProject(app, "mocked_user_id_1", projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body).toEqual({
        ...projectAUpdateDto,
        id: projectId,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });

      const foundProject = await projectRepository.findOne(projectId);
      expect(foundProject).not.toBeNull();

      const foundProject2 = await userProjectRepository.findOne({
        projectId: projectId,
        userId: "mocked_user_id_1"
      });
      expect(foundProject2).not.toBeNull();
      expect(foundProject2.role).toBe(Role.Owner);
    });

    it("7) Delete project", async () => {
      const deleteResult = await ProjectHelper.deleteProject(app, "mocked_user_id_1", projectId);
      expect(deleteResult.status).toBe(204);
    });

    it("8) Get list of user's project", async () => {
      const getResult = await ProjectHelper.getProjectsOfUser(app, "mocked_user_id_1");
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(0);
    });
  });
});