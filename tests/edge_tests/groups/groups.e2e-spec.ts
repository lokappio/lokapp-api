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
import AuthTestsHelpers from "../../auth/auth-tests.helpers";
import ProjectsModule from "../../../src/projects/projects.module";
import EdgeHelper from "../../helpers/EdgeHelper";
import ProjectsTestHelpers from "../../projects/projects-test.helpers";
import Role from "../../../src/roles/role.enum";
import Group from "../../../src/groups/group.entity";
import GroupModule from "../../../src/groups/group.module";
import CreateGroupDto from "../../../src/groups/dto/create-group.dto";
import GroupHelper from "../../helpers/GroupHelper";
import UpdateGroupDto from "../../../src/groups/dto/update-group.dto";

describe("Group edge", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let groupRepository: Repository<Group>;

  const userAId = "user_1_ID";
  const userBId = "user_2_ID";

  const userA = new User(userAId, "userA");
  const userB = new User(userBId, "UserB");

  const project = new Project();
  const projectB = new Project();
  let projectId: number;

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

    //Setup users
    userA.email = "usera@email.com";
    userB.email = "userb@email.com";
    await userRepository.save(userA);
    await userRepository.save(userB);

    //Setup project
    project.name = "project name";
    project.color = "FFFFFF";
    await projectRepository.save(project);
    const relation = new UserProject();
    relation.project = (await projectRepository.findOne({where: {name: project.name}}));
    relation.user = userA;
    relation.role = Role.Owner;
    await userProjectRepository.save(relation);
    projectId = relation.project.id;
    projectB.name = "project nameB";
    projectB.color = "FFFFFF";
    await projectRepository.save(projectB);
    const relation2 = new UserProject();
    relation2.project = (await projectRepository.findOne({where: {name: projectB.name}}));
    relation2.user = userA;
    relation2.role = Role.Owner;
    await userProjectRepository.save(relation2);

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

  beforeEach(async () => {
    await groupRepository.clear();
  });

  describe("Create group", () => {
    const createGroupDto = new CreateGroupDto({
      name: "groupName"
    });

    beforeEach(async () => {
      await groupRepository.clear();
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/groups`)
        .send(createGroupDto);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${123456}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(createGroupDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId)
        .send(createGroupDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("GroupName already exists", async () => {
      const req = await request(app.getHttpServer())
        .post(`/projects/${projectId}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(createGroupDto);
      expect(req.status).toBe(201);

      const req2 = request(app.getHttpServer())
        .post(`/projects/${projectId}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(createGroupDto);
      await EdgeHelper.entityAlreadyExists(req2);
    });

    it("Wrong DTO on request", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({});
      await EdgeHelper.requestWithInvalidDto(req);

      const req2 = request(app.getHttpServer())
        .post(`/projects/${projectId}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.requestWithInvalidDto(req2);
    });
  });

  describe("Get every groups", () => {
    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${projectId}/groups`);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${123456}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.entityNotFound(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${projectId}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId);
      await EdgeHelper.entityNotReachable(req);
    });
  });

  describe("Update group", () => {
    let group = new Group();
    const updateGroupDto = new UpdateGroupDto({
      name: "New Name"
    });

    beforeEach(async () => {
      await groupRepository.clear();
      group.name = "Group Name";
      group.project = project;
      group = await GroupHelper.dbAddGroup(groupRepository, group);
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/groups/${group.id}`)
        .send(updateGroupDto);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${123456}/groups/${group.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(updateGroupDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/groups/${group.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId)
        .send(updateGroupDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("GroupID isn't with projectID", async () => {
      //Create a false group in project B
      let groupB = new Group();
      groupB.name = "groupB";
      groupB.project = projectB;
      groupB = await GroupHelper.dbAddGroup(groupRepository, groupB);

      const req = request(app.getHttpServer())
        .patch(`/projects/${projectB.id}/groups/${group.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(updateGroupDto);
      await EdgeHelper.entityNotFound(req);

      const req2 = request(app.getHttpServer())
        .patch(`/projects/${projectId}/groups/${groupB.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(updateGroupDto);
      await EdgeHelper.entityNotFound(req2);
    });

    it("GroupID not found", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/groups/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(updateGroupDto);
      await EdgeHelper.entityNotFound(req);
    });

    it("Group Name already exists", async () => {
      //Create a false group
      let groupB = new Group();
      groupB.name = updateGroupDto.name;
      groupB.project = project;
      groupB = await GroupHelper.dbAddGroup(groupRepository, groupB);

      const req = request(app.getHttpServer())
        .patch(`/projects/${projectB.id}/groups/${group.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(updateGroupDto);
      await EdgeHelper.entityNotFound(req);
    });

    it("Wrong DTO on request", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/groups/${group.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({});
      await EdgeHelper.requestWithInvalidDto(req);

      const req2 = request(app.getHttpServer())
        .patch(`/projects/${projectId}/groups/${group.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.requestWithInvalidDto(req2);
    });
  });
});