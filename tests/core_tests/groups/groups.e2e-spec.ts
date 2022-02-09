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
import Group from "../../../src/groups/group.entity";
import GroupModule from "../../../src/groups/group.module";
import CreateGroupDto from "../../../src/groups/dto/create-group.dto";
import UpdateGroupDto from "../../../src/groups/dto/update-group.dto";
import GroupHelper from "../../helpers/GroupHelper";

describe("Groups", () => {
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

  describe("Use case #1", () => {
    const userA = new User("mocked_user_id_1", "username one");
    userA.email = "userA@email.com";

    const projectCreated = new Project();
    projectCreated.name = "project_name";
    projectCreated.color = "FFFFFF";

    const userProjectCreated = new UserProject();
    let projectId: number;

    let keyA = new TranslationKey();
    const keyB = new TranslationKey();

    const createGroupDto = new CreateGroupDto({
      name: "groupA"
    });
    const updateGroupDto = new UpdateGroupDto({
      name: "groupB"
    });
    let group: Group;

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

      keyA.is_plural = false;
      keyB.is_plural = false;
      keyA.name = "keyA";
      keyB.name = "keyB";
      keyA.project = project;
      keyB.project = project;
    });

    it("1) User get list of groups", async () => {
      const getResult = await GroupHelper.getGroups(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(0);
    });

    it("2) User create group", async () => {
      const createResult = await GroupHelper.createGroup(app, userA.id, projectId, createGroupDto);
      expect(createResult.status).toBe(201);
      expect(createResult.body).toEqual({
        ...createGroupDto,
        id: expect.any(Number),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
      group = createResult.body;
    });

    it("3) User get list of groups", async () => {
      const getResult = await GroupHelper.getGroups(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(1);

      const res = await groupRepository.find({
        where: {
          project: {
            id: projectId
          }
        }
      });
      expect(res.length).toBe(1);
    });

    it("4) User create key on groupA", async () => {
      keyA.group = group;
      keyA = await KeyHelper.dbAddKey(keyRepository, keyA);
    });

    it("5) User get every keys/values", async () => {
      const getResult = await KeyHelper.getEveryKeysValues(app, userA.id, projectId);
      expect(getResult.body.length).toBe(1);
      expect(getResult.body).toEqual([
        {
          key_id: keyA.id,
          key_name: keyA.name,
          is_plural: (keyA.is_plural ? (1) : (0)),
          value_id: null,
          value_name: null,
          quantity: null,
          language_id: null,
          language_name: null,
          group_id: group.id,
          group_name: createGroupDto.name
        }
      ]);
    });

    it("6) User update group", async () => {
      const updateResult = await GroupHelper.updateGroup(app, userA.id, projectId, group.id, updateGroupDto);
      expect(updateResult.status).toBe(200);
      expect(updateResult.body).toEqual({
        ...updateGroupDto,
        id: expect.any(Number),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it("7) User get every keys/values", async () => {
      const getResult = await KeyHelper.getEveryKeysValues(app, userA.id, projectId);
      expect(getResult.body.length).toBe(1);
      expect(getResult.body).toEqual([
        {
          key_id: keyA.id,
          key_name: keyA.name,
          is_plural: (keyA.is_plural ? (1) : (0)),
          value_id: null,
          value_name: null,
          quantity: null,
          language_id: null,
          language_name: null,
          group_id: group.id,
          group_name: updateGroupDto.name
        }
      ]);
    });

    it("8) User get list of groups", async () => {
      const getResult = await GroupHelper.getGroups(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(1);
      expect(getResult.body[0].name).toBe(updateGroupDto.name);

      const res = await groupRepository.find({
        where: {
          project: {
            id: projectId
          }
        }
      });
      expect(res.length).toBe(1);
      expect(res[0].name).toBe(updateGroupDto.name);
    });
  });
});