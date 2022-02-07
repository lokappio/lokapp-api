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
import ProjectHelper from "../../helpers/ProjectHelper";
import Role from "../../../src/roles/role.enum";
import TranslationKey from "../../../src/translation/translation_key.entity";
import TranslationModule from "../../../src/translation/translation.module";
import CreateKeyDto from "../../../src/translation/dto/create-key.dto";
import KeyHelper from "../../helpers/KeyHelper";
import UpdateKeyDto from "../../../src/translation/dto/update-key.dto";
import Group, {DefaultGroupName} from "../../../src/groups/group.entity";
import GroupModule from "../../../src/groups/group.module";
import GroupHelper from "../../helpers/GroupHelper";

describe("Key edge", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let keyRepository: Repository<TranslationKey>;
  let groupRepository: Repository<Group>;

  const userAId = "user_1_ID";
  const userBId = "user_2_ID";

  const userA = new User(userAId, "userA");
  const userB = new User(userBId, "UserB");

  const project = new Project();
  let projectId: number;

  let defaultGroup = new Group();

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

    //Setup users
    userA.email = "usera@email.com";
    userB.email = "userb@email.com";
    await AuthHelper.dbAddUser(userRepository, userA);
    await AuthHelper.dbAddUser(userRepository, userB);

    //Setup project
    project.name = "project name";
    project.color = "FFFFFF";
    await ProjectHelper.dbAddProject(projectRepository, project);
    const relation = new UserProject();
    relation.project = (await projectRepository.findOne({where: {name: project.name}}));
    relation.user = userA;
    relation.role = Role.Owner;
    await ProjectHelper.dbAddUserProjectRelation(userProjectRepository, relation);
    projectId = relation.project.id;

    defaultGroup.name = DefaultGroupName;
    defaultGroup.project = project;
    defaultGroup = await GroupHelper.dbAddGroup(groupRepository, defaultGroup);

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

  beforeEach(async () => {
    await keyRepository.clear();
  });

  describe("Get list of keys", () => {
    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${projectId}/translations`);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${123456}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.entityNotFound(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${projectId}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId);
      await EdgeHelper.entityNotReachable(req);
    });
  });

  describe("Create key", () => {
    let createKeyDto: CreateKeyDto;

    beforeEach(async () => {
      createKeyDto = new CreateKeyDto({
        name: "mykey",
        group_id: defaultGroup.id,
        is_plural: false
      });
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations`)
        .send(createKeyDto);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${123456}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(createKeyDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId)
        .send(createKeyDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("Wrong DTO on request", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({});
      await EdgeHelper.requestWithInvalidDto(req);

      const req2 = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({name: "lorem_ipsum"});
      await EdgeHelper.requestWithInvalidDto(req2);

      const req3 = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({name: "titi", is_plural: "notaboolean"});
      await EdgeHelper.requestWithInvalidDto(req3);
    });

    it("Key name already exists", async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(createKeyDto);

      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(createKeyDto);
      await EdgeHelper.entityAlreadyExists(req);
    });

    it("Group ID not found", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({name: "my key", is_plural: false, group_id: 123456});
      await EdgeHelper.entityNotFound(req);
    });
  });

  describe("Update key", () => {
    let keyId: number;
    const key = new TranslationKey();
    key.group = defaultGroup;
    key.is_plural = false;
    key.name = "My key";

    const updateKeyDto = new UpdateKeyDto({
      name: "Updated name"
    });

    beforeEach(async () => {
      key.project = await projectRepository.findOne(projectId);
      keyId = (await KeyHelper.dbAddKey(keyRepository, key)).id;
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyId}`)
        .send(updateKeyDto);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${123456}/translations/${keyId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(updateKeyDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId)
        .send(updateKeyDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("Key not found", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(updateKeyDto);
      await EdgeHelper.entityNotFound(req);
    });

    it("Key Name already exists", async () => {
      const key2 = new TranslationKey();
      key2.group = defaultGroup;
      key2.is_plural = false;
      key2.name = "My second key";
      key2.project = await projectRepository.findOne(projectId);
      const keyId2 = (await KeyHelper.dbAddKey(keyRepository, key2)).id;

      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyId2}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({name: key.name});
      await EdgeHelper.entityAlreadyExists(req);
    });

    it("Group ID not found", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({group_id: 123456});
      await EdgeHelper.entityNotFound(req);
    });

    it("Wrong DTO on request", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({});
      await EdgeHelper.requestWithInvalidDto(req);

      const req2 = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({group_id: "not-a-number"});
      await EdgeHelper.requestWithInvalidDto(req2);

      const req3 = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({is_plural: "not-a-boolean"});
      await EdgeHelper.requestWithInvalidDto(req3);

      const req4 = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({name: 123456});
      await EdgeHelper.requestWithInvalidDto(req4);
    });
  });

  describe("Get one key", () => {
    let keyId: number;
    const key = new TranslationKey();
    key.group = null;
    key.is_plural = false;
    key.name = "My key";

    beforeEach(async () => {
      key.project = await projectRepository.findOne(projectId);
      keyId = (await KeyHelper.dbAddKey(keyRepository, key)).id;
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${projectId}/translations/${keyId}`);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${123456}/translations/${keyId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.entityNotFound(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${projectId}/translations/${keyId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId);
      await EdgeHelper.entityNotReachable(req);
    });

    it("Key not found", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${projectId}/translations/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.entityNotFound(req);
    });
  });

  describe("Get every keys/values of project", () => {
    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${projectId}/translations/all`);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${123456}/translations/all`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.entityNotFound(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${projectId}/translations/all`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId);
      await EdgeHelper.entityNotReachable(req);
    });
  });

  describe("Delete key", () => {
    let keyId: number;
    const key = new TranslationKey();
    key.group = null;
    key.is_plural = false;
    key.name = "My key";

    beforeEach(async () => {
      key.project = await projectRepository.findOne(projectId);
      keyId = (await KeyHelper.dbAddKey(keyRepository, key)).id;
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectId}/translations/${keyId}`);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${123456}/translations/${keyId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.roleGuardError(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectId}/translations/${keyId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId);
      await EdgeHelper.roleGuardError(req);
    });

    it("Key not found", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectId}/translations/${123456}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.entityNotFound(req);
    });
  });
});