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
import UserProject from "../../../src/users-projects/user_project.entity";
import Project from "../../../src/projects/project.entity";
import ProjectsModule from "../../../src/projects/projects.module";
import {JwtAuthUserGuard} from "../../../src/auth/guards/jwt-auth-user.guard";
import Language from "../../../src/languages/language.entity";
import AuthHelper from "../../helpers/AuthHelper";
import ProjectHelper from "../../helpers/ProjectHelper";
import Role from "../../../src/roles/role.enum";
import LanguageHelper from "../../helpers/LanguageHelper";
import CreateLanguageDto from "../../../src/projects/dto/create-language.dto";

describe("Languages", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let languageRepository: Repository<Language>;

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

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await languageRepository.clear();
    await app.close();
  });

  describe("Use case #1", () => {
    const userA = new User("mocked_user_id_1", "username one");
    userA.email = "userA@email.com";

    const projectCreated = new Project();
    projectCreated.name = "project_name";
    projectCreated.color = "FFFFFF";

    const userProjectCreated = new UserProject();
    let projectId: number;

    const languageCreatedDto = new CreateLanguageDto({
      name: "languageName"
    });
    const languageUpdatedDto = new CreateLanguageDto({
      name: "updatedName"
    });
    let languageId: number;

    beforeAll(async () => {
      //Register user
      await AuthHelper.dbAddUser(userRepository, userA);

      //Create project
      await ProjectHelper.dbAddProject(projectRepository, projectCreated);
      const project = await projectRepository.findOne({
        where: {
          name: projectCreated.name
        }
      });
      projectId = project.id;
      userProjectCreated.project = project;
      userProjectCreated.userId = userA.id;
      userProjectCreated.role = Role.Owner;
      await ProjectHelper.dbAddUserProjectRelation(userProjectRepository, userProjectCreated);
    });

    it("1) Get list of project's language", async () => {
      const getResult = await LanguageHelper.getLanguagesOfProject(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(0);
    });

    it("2) User create Language", async () => {
      const createResult = await LanguageHelper.createLanguage(app, userA.id, projectId, languageCreatedDto);
      expect(createResult.status).toBe(201);
      expect(createResult.body).toEqual({
        ...languageCreatedDto,
        id: expect.any(Number),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
      languageId = createResult.body.id;
    });

    it("3) Get list of project's language", async () => {
      const getResult = await LanguageHelper.getLanguagesOfProject(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(1);
    });

    it("4) Get language", async () => {
      const getResult = await LanguageHelper.getLanguageOfProject(app, userA.id, projectId, languageId);
      expect(getResult.status).toBe(200);
      expect(getResult.body).toEqual({
        ...languageCreatedDto,
        id: languageId,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });

      const foundLanguage = await languageRepository.findOne(languageId);
      expect(foundLanguage).not.toBeNull();
    });

    it("5) Update language", async () => {
      const updateResult = await LanguageHelper.updateLanguage(app, userA.id, projectId, languageId, languageUpdatedDto);
      expect(updateResult.status).toBe(200);
      expect(updateResult.body).toEqual({
        ...languageUpdatedDto,
        id: languageId,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it("6) Get language", async () => {
      const getResult = await LanguageHelper.getLanguageOfProject(app, userA.id, projectId, languageId);
      expect(getResult.status).toBe(200);
      expect(getResult.body).toEqual({
        ...languageUpdatedDto,
        id: languageId,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });

      const foundLanguage = await languageRepository.findOne(languageId);
      expect(foundLanguage).not.toBeNull();
    });

    it("7) Delete language", async () => {
      const deleteResult = await LanguageHelper.deleteLanguage(app, userA.id, projectId, languageId);
      expect(deleteResult.status).toBe(204);
    });

    it("8) Get list of project's language", async () => {
      const getResult = await LanguageHelper.getLanguagesOfProject(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(0);
    });
  });
});