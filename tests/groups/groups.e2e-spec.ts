import {INestApplication} from "@nestjs/common";
import {getRepositoryToken} from "@nestjs/typeorm";
import User from "../../src/users/user.entity";
import {Repository} from "typeorm";
import {mockedAuthGuard} from "../common/mocked-auth-guard";
import {HttpExceptionFilter} from "../../src/common/http-error.filter";
import {TestQueryExceptionFilter} from "../common/test-query-error.filter";
import UserProject from "../../src/users-projects/user_project.entity";
import Project from "../../src/projects/project.entity";
import {JwtAuthUserGuard} from "../../src/auth/guards/jwt-auth-user.guard";
import Group, {DefaultGroupName} from "../../src/groups/group.entity";
import * as request from "supertest";
import TestsHelpers from "../helpers/tests.helpers";
import CreateProjectDto from "../../src/projects/dto/create-project.dto";
import CreateGroupDto from "../../src/groups/dto/create-group.dto";

describe("Groups E2E", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let groupRepository: Repository<Group>;

  let populatedProjects: Project[];

  beforeAll(async () => {
    const moduleRef = await TestsHelpers.getTestingModule()
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

    const populatedUsers = await TestsHelpers.populateUsers(userRepository);
    populatedProjects = await TestsHelpers.populateProjects(projectRepository);
    await TestsHelpers.populateDefaultRelations(populatedUsers, populatedProjects, userProjectRepository);
  });

  afterAll(async () => {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await groupRepository.clear();
    await app.close();
  });

  async function findGroups(projectId: number): Promise<Group[]> {
    return await groupRepository.find({
      where: {
        project: {
          id: projectId
        }
      }
    });
  }

  describe("Creating group", () => {
    afterEach(async () => {
      await groupRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/groups`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/123465/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Group name"});
      expect(response.status).toEqual(403);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3)
        .send({name: "Group name"});
      expect(response.status).toEqual(403);
    });

    it("Creating group with DTO error", async () => {
      const missingDataResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({});
      expect(missingDataResp.status).toEqual(400);
    });

    it("Creating a group", async () => {
      const groupResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(new CreateGroupDto({name: "Group name"}));
      expect(groupResp.status).toEqual(201);

      const groups = await findGroups(populatedProjects[0].id);
      expect(groups).not.toBeNull();
      expect(groups.length).toEqual(1);
    });

    it("Already existing group", async () => {
      const createGroupResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Group #1"});
      expect(createGroupResp.status).toEqual(201);

      const duplicatedGroupResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Group #1"});
      expect(duplicatedGroupResp.status).toEqual(422);
    });

    it("Creating a project from the API will create a default group", async () => {
      const createdProjectResp = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(new CreateProjectDto({
          name: "New project",
          description: "Lorem ipsum dolor sit amet",
          color: "000000",
          languages: ["EN"]
        }));
      expect(createdProjectResp.status).toBe(201);

      const groups = await findGroups(createdProjectResp.body.id);
      expect(groups.length).toEqual(1);
      expect(groups[0].name).toEqual(DefaultGroupName);
    });
  });

  describe("Getting groups", () => {
    afterEach(async () => {
      await groupRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/groups`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/123465/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(404);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(response.status).toEqual(403);
    });

    it("Non existing group", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/123465/groups/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(404);
    });

    it("Getting groups", async () => {
      const noGroupResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(noGroupResp.status).toEqual(200);
      expect(noGroupResp.body.length).toEqual(0);

      const createGroupResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(new CreateGroupDto({name: "Awesome group"}));
      expect(createGroupResp.status).toEqual(201);

      const groupsResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(groupsResp.status).toEqual(200);
      expect(groupsResp.body.length).toEqual(1);
    });
  });

  describe("Editing group", () => {
    afterEach(async () => {
      await groupRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/groups/1`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/projects/123465/groups/1`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(403);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/groups/1`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(response.status).toEqual(403);
    });

    it("Non existing group", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/groups/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Lorem ipsum"});
      expect(response.status).toEqual(404);
    });

    it("Editing group with DTO errors", async () => {
      const createGroupResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(new CreateGroupDto({name: "Group name"}));
      expect(createGroupResp.status).toEqual(201);

      const missingDataResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/groups/${createGroupResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({});
      expect(missingDataResp.status).toEqual(400);
    });

    it("Editing a group", async () => {
      const createGroupResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(new CreateGroupDto({name: "Group name"}));
      expect(createGroupResp.status).toEqual(201);

      const editGroupDto = new CreateGroupDto({name: "Edited group name"});
      const editingResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/groups/${createGroupResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(editGroupDto);
      expect(editingResp.status).toEqual(200);

      const gettingGroupsResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(gettingGroupsResp.status).toEqual(200);

      const groups = <Group[]>gettingGroupsResp.body;
      const previousGroupName = groups.find(group => group.name == "Group name");
      expect(previousGroupName).toBeUndefined();
      const updatedGroupName = groups.find(group => group.name == editGroupDto.name);
      expect(updatedGroupName).not.toBeNull();
    });

    it("Already existing group", async () => {
      const group1Resp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Group #1"});
      expect(group1Resp.status).toEqual(201);

      const group2Resp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Group #2"});
      expect(group2Resp.status).toEqual(201);

      const editGroupDto = new CreateGroupDto({name: "Group #1"});
      const editingResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/groups/${group2Resp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(editGroupDto);
      expect(editingResp.status).toEqual(422);

      const gettingGroupsResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/groups`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(gettingGroupsResp.status).toEqual(200);

      const previousGroupName = gettingGroupsResp.body.find(group => group.name == "Group name");
      expect(previousGroupName).toBeUndefined();
      const updatedGroupName = gettingGroupsResp.body.find(group => group.name == editGroupDto.name);
      expect(updatedGroupName).not.toBeNull();
    });
  });
});