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
import TranslationKey from "../../../src/translation/translation_key.entity";
import TranslationModule from "../../../src/translation/translation.module";
import AuthTestsHelpers from "../../auth/auth-tests.helpers";
import ProjectsTestHelpers from "../../projects/projects-test.helpers";
import Role from "../../../src/roles/role.enum";
import KeyHelper from "../../helpers/KeyHelper";
import TranslationValue from "../../../src/translation/translation_value.entity";
import ValueHelper from "../../helpers/ValueHelper";
import Language from "../../../src/languages/language.entity";
import LanguageHelper from "../../helpers/LanguageHelper";
import QuantityString from "../../../src/translation/quantity_string.enum";

describe("Values", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let languageRepository: Repository<Language>;
  let keyRepository: Repository<TranslationKey>;
  let valueRepository: Repository<TranslationValue>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        UsersModule,
        AuthModule,
        ProjectsModule,
        TranslationModule,
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
          provide: getRepositoryToken(TranslationKey),
          useClass: Repository
        },
        {
          provide: getRepositoryToken(TranslationValue),
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
    keyRepository = moduleRef.get<Repository<TranslationKey>>(getRepositoryToken(TranslationKey));
    valueRepository = moduleRef.get<Repository<TranslationValue>>(getRepositoryToken(TranslationValue));

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await languageRepository.clear();
    await keyRepository.clear();
    await valueRepository.clear();
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

    let langA = new Language();
    langA.name = "langA";
    let langB = new Language();
    langB.name = "langB";

    let keyA = new TranslationKey();
    keyA.name = "keyA";
    keyA.group_id = null;
    keyA.is_plural = false;

    let valueAId: number;
    let valueBId: number;

    beforeAll(async () => {
      //Register user
      await userRepository.save(userA);

      //Create project
      await projectRepository.save(projectCreated);
      const project = await projectRepository.findOne({
        where: {
          name: projectCreated.name
        }
      });
      projectId = project.id;
      userProjectCreated.project = project;
      userProjectCreated.userId = userA.id;
      userProjectCreated.role = Role.Owner;
      await userProjectRepository.save(userProjectCreated);

      //Create languages
      langA.project = project;
      langB.project = project;
      langA = await LanguageHelper.dbAddLanguage(languageRepository, langA);
      langB = await LanguageHelper.dbAddLanguage(languageRepository, langB);

      //Create keys
      keyA.project = project;
      keyA = await KeyHelper.dbAddKey(keyRepository, keyA);
    });

    it("1) Get list of every keys/values", async () => {
      const getResult = await KeyHelper.getEveryKeysValues(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(2);
      expect(getResult.body).toEqual([
        {
          key_id: keyA.id,
          key_name: keyA.name,
          is_plural: (keyA.is_plural ? (1) : (0)),
          value_id: null,
          value_name: null,
          quantity: null,
          language_id: langA.id,
          language_name: langA.name,
          group_id: null,
          group_name: null
        },
        {
          key_id: keyA.id,
          key_name: keyA.name,
          is_plural: (keyA.is_plural ? (1) : (0)),
          value_id: null,
          value_name: null,
          quantity: null,
          language_id: langB.id,
          language_name: langB.name,
          group_id: null,
          group_name: null
        }
      ]);
    });

    it("2) User create value for singular key", async () => {
      const createResult = await ValueHelper.createValue(app, userA.id, projectId, keyA.id, {name: "valueA langA", language_id: langA.id, quantity_string: null});
      expect(createResult.status).toBe(201);
      expect(createResult.body).toEqual({
        id: expect.any(Number),
        name: "valueA langA",
        quantity_string: null,
        key_id: keyA.id,
        language_id: langA.id,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
      valueAId = createResult.body.id;

      const createResult2 = await ValueHelper.createValue(app, userA.id, projectId, keyA.id, {name: "valueA langB", language_id: langB.id, quantity_string: null});
      expect(createResult2.status).toBe(201);
      valueBId = createResult2.body.id;
    });

    it("3) User get every keys/values", async () => {
      const getResult = await KeyHelper.getEveryKeysValues(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body).toEqual([
        {
          key_id: keyA.id,
          key_name: keyA.name,
          is_plural: (keyA.is_plural ? (1) : (0)),
          value_id: expect.any(Number),
          value_name: "valueA langA",
          quantity: null,
          language_id: langA.id,
          language_name: langA.name,
          group_id: null,
          group_name: null
        },
        {
          key_id: keyA.id,
          key_name: keyA.name,
          is_plural: (keyA.is_plural ? (1) : (0)),
          value_id: expect.any(Number),
          value_name: "valueA langB",
          quantity: null,
          language_id: langB.id,
          language_name: langB.name,
          group_id: null,
          group_name: null
        }
      ]);
    });

    it("4) User update key into plural key", async () => {
      const updateResult = await KeyHelper.updateKey(app, userA.id, projectId, keyA.id, {is_plural: true});
      expect(updateResult.status).toBe(200);
      keyA = updateResult.body;
    });

    it("5) Get every keys/values", async () => {
      const getResult = await KeyHelper.getEveryKeysValues(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body).toEqual([
        {
          key_id: keyA.id,
          key_name: keyA.name,
          is_plural: (keyA.is_plural ? (1) : (0)),
          value_id: expect.any(Number),
          value_name: "valueA langA",
          quantity: QuantityString.OTHER,
          language_id: langA.id,
          language_name: langA.name,
          group_id: null,
          group_name: null
        },
        {
          key_id: keyA.id,
          key_name: keyA.name,
          is_plural: (keyA.is_plural ? (1) : (0)),
          value_id: expect.any(Number),
          value_name: "valueA langB",
          quantity: QuantityString.OTHER,
          language_id: langB.id,
          language_name: langB.name,
          group_id: null,
          group_name: null
        }
      ]);
    });

    it("6) Create plural values", async () => {
      const createResult = await ValueHelper.createValue(app, userA.id, projectId, keyA.id, {name: "valueA langA ONE", language_id: langA.id, quantity_string: QuantityString.ONE});
      expect(createResult.status).toBe(201);

      const createResult2 = await ValueHelper.createValue(app, userA.id, projectId, keyA.id, {name: "valueA langB ONE", language_id: langB.id, quantity_string: QuantityString.ONE});
      expect(createResult2.status).toBe(201);

      const createResult3 = await ValueHelper.createValue(app, userA.id, projectId, keyA.id, {name: "valueA langA ZERO", language_id: langA.id, quantity_string: QuantityString.ZERO});
      expect(createResult3.status).toBe(201);

      const createResult4 = await ValueHelper.createValue(app, userA.id, projectId, keyA.id, {name: "valueA langB ZERO", language_id: langB.id, quantity_string: QuantityString.ZERO});
      expect(createResult4.status).toBe(201);
    });

    it("7) Get every keys/values", async () => {
      const getResult = await KeyHelper.getEveryKeysValues(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(6);
    });

    it("8) Update values", async () => {
      const updateValue = await ValueHelper.updateValue(app, userA.id, projectId, keyA.id, valueAId, {name: "update name"});
      const updateValue2 = await ValueHelper.updateValue(app, userA.id, projectId, keyA.id, valueBId, {name: "update name2"});

      expect(updateValue.status).toBe(200);
      expect(updateValue2.status).toBe(200);
      expect(updateValue.body.name).toEqual("update name");
      expect(updateValue2.body.name).toEqual("update name2");
    });

    it("9) Delete value", async () => {
      const deleteValue = await ValueHelper.deleteValue(app, userA.id, projectId, keyA.id, valueAId);
      expect(deleteValue.status).toBe(204);
    });

    it("10) Get every keys/values", async () => {
      const getResult = await KeyHelper.getEveryKeysValues(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(5);
    });

    it("11) Update key into singular", async () => {
      const updateResult = await KeyHelper.updateKey(app, userA.id, projectId, keyA.id, {is_plural: false});
      expect(updateResult.status).toBe(200);
      keyA = updateResult.body;
    });

    it("12) Get every keys/values", async () => {
      const getResult = await KeyHelper.getEveryKeysValues(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(2);
      expect(getResult.body).toEqual([
        {
          key_id: keyA.id,
          key_name: keyA.name,
          is_plural: (keyA.is_plural ? (1) : (0)),
          value_id: null,
          value_name: null,
          quantity: null,
          language_id: langA.id,
          language_name: langA.name,
          group_id: null,
          group_name: null
        },
        {
          key_id: keyA.id,
          key_name: keyA.name,
          is_plural: (keyA.is_plural ? (1) : (0)),
          value_id: valueBId,
          value_name: "update name2",
          quantity: null,
          language_id: langB.id,
          language_name: langB.name,
          group_id: null,
          group_name: null
        }
      ]);
    });
  });
});