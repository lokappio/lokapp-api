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
import CreateKeyDto from "../../../src/translation/dto/create-key.dto";
import UpdateKeyDto from "../../../src/translation/dto/update-key.dto";
import Group, {DefaultGroupName} from "../../../src/groups/group.entity";
import GroupHelper from "../../helpers/GroupHelper";
import GroupModule from "../../../src/groups/group.module";
import TestsHelpers from "../../helpers/tests.helpers";

describe("Keys", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let keyRepository: Repository<TranslationKey>;
  let groupRepository: Repository<Group>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        UsersModule,
        AuthModule,
        ProjectsModule,
        TranslationModule,
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
          provide: getRepositoryToken(TranslationKey),
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
    keyRepository = moduleRef.get<Repository<TranslationKey>>(getRepositoryToken(TranslationKey));
    groupRepository = moduleRef.get<Repository<Group>>(getRepositoryToken(Group));

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await keyRepository.clear();
    await groupRepository.clear();
    await app.close();
  });

  describe("use case #1", () => {
    const userA = new User("mocked_user_id_1", "username one");
    userA.email = "userA@email.com";

    const projectCreated = new Project();
    projectCreated.name = "project_name";
    projectCreated.color = "FFFFFF";

    const userProjectCreated = new UserProject();
    let projectId: number;

    const keyCreateDto = new CreateKeyDto({
      name: "my key",
      is_plural: false,
      group_id: null
    });
    const keyUpdatePluralDto = new UpdateKeyDto({
      is_plural: true
    });
    const keyUpdateNameDto = new UpdateKeyDto({
      name: "update name"
    });
    let keyId: number;

    let defaultGroup = new Group();

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

      defaultGroup.name = DefaultGroupName;
      defaultGroup.project = project;
      defaultGroup = await GroupHelper.dbAddGroup(groupRepository, defaultGroup);
      keyCreateDto.group_id = defaultGroup.id;
    });

    it("1) Get list of keys", async () => {
      const getResult = await KeyHelper.getKeysOfProject(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(0);
    });

    it("2) Create key", async () => {
      const createResult = await KeyHelper.createKey(app, userA.id, projectId, keyCreateDto);
      expect(createResult.status).toBe(201);
      expect(createResult.body).toEqual({
        ...keyCreateDto,
        id: expect.any(Number),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
      keyId = createResult.body.id;
    });

    it("3) Get list of keys", async () => {
      const getResult = await KeyHelper.getKeysOfProject(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(1);
    });

    it("4) Update key into plural", async () => {
      const updateKey = await KeyHelper.updateKey(app, userA.id, projectId, keyId, keyUpdatePluralDto);
      expect(updateKey.status).toBe(200);
      expect(updateKey.body).toEqual({
        name: keyCreateDto.name,
        group_id: keyCreateDto.group_id,
        is_plural: keyUpdatePluralDto.is_plural,
        id: keyId,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it("5) Get one key", async () => {
      const getResult = await KeyHelper.getKey(app, userA.id, projectId, keyId);
      expect(getResult.status).toBe(200);
      expect(getResult.body).toEqual({
        name: keyCreateDto.name,
        group_id: keyCreateDto.group_id,
        is_plural: keyUpdatePluralDto.is_plural,
        id: keyId,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it("6) Update name of key", async () => {
      const updateKey = await KeyHelper.updateKey(app, userA.id, projectId, keyId, keyUpdateNameDto);
      expect(updateKey.status).toBe(200);
      expect(updateKey.body).toEqual({
        name: keyUpdateNameDto.name,
        group_id: keyCreateDto.group_id,
        is_plural: keyUpdatePluralDto.is_plural,
        id: keyId,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it("7) Get list of keys", async () => {
      const foundKey = await keyRepository.find({where: {project: {id: projectId}}});
      expect(foundKey.length).toBe(1);
      expect(foundKey[0].name).toBe(keyUpdateNameDto.name);
      expect(foundKey[0].group_id).toBe(keyCreateDto.group_id);
      expect(foundKey[0].is_plural).toBe(keyUpdatePluralDto.is_plural);
      expect(foundKey[0].id).toBe(keyId);
    });

    it("8) Get list of every keys/values", async () => {
      const getResult = await KeyHelper.getEveryKeysValues(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(1);
      expect(getResult.body).toEqual([{
        key_id: keyId,
        key_name: keyUpdateNameDto.name,
        is_plural: (keyUpdatePluralDto.is_plural ? (1) : (0)),
        value_id: null,
        value_name: null,
        quantity: null,
        language_id: null,
        language_name: null,
        group_id: defaultGroup.id,
        group_name: DefaultGroupName
      }]);
    });

    it("9) Delete key", async () => {
      const deleteResult = await KeyHelper.deleteKey(app, userA.id, projectId, keyId);
      expect(deleteResult.status).toBe(204);
    });

    it("10) Get list of keys", async () => {
      const foundKey = await keyRepository.find({where: {project: {id: projectId}}});
      expect(foundKey.length).toBe(0);
    });
  });
});