import {INestApplication} from "@nestjs/common";
import {getRepositoryToken} from "@nestjs/typeorm";
import User from "../../src/users/user.entity";
import {Repository} from "typeorm";
import {mockedAuthGuard} from "../common/mocked-auth-guard";
import {HttpExceptionFilter} from "../../src/common/http-error.filter";
import {TestQueryExceptionFilter} from "../common/test-query-error.filter";
import {JwtAuthUserGuard} from "../../src/auth/guards/jwt-auth-user.guard";
import Project from "../../src/projects/project.entity";
import UserProject from "../../src/users-projects/user_project.entity";
import TestsHelpers from "../helpers/tests.helpers";
import * as request from "supertest";
import {Response} from "supertest";
import Role from "../../src/roles/role.enum";
import CreateInvitationDto from "../../src/invitations/dto/create-invitation.dto";
import Invitation from "../../src/invitations/invitation.entity";

describe("Users of a project E2E", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let invitationRepository: Repository<Invitation>;

  let populatedProjects: Project[];

  beforeAll(async () => {
    const moduleRef = await TestsHelpers.getTestingModule()
      .overrideGuard(JwtAuthUserGuard)
      .useValue(mockedAuthGuard)
      .compile();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    projectRepository = moduleRef.get<Repository<Project>>(getRepositoryToken(Project));
    userProjectRepository = moduleRef.get<Repository<UserProject>>(getRepositoryToken(UserProject));
    invitationRepository = moduleRef.get<Repository<Invitation>>(getRepositoryToken(Invitation));

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();

    // Populate users and projects in database
    await TestsHelpers.populateUsers(userRepository);
    populatedProjects = await TestsHelpers.populateProjects(projectRepository);
  });

  afterAll(async () => {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await invitationRepository.clear();
    await app.close();
  });

  async function createRelation(project: Project, userId: string, role: Role): Promise<void> {
    const relation = new UserProject();
    relation.user = await userRepository.findOneById(userId);
    relation.project = project;
    relation.role = role;
    await userProjectRepository.save(relation);
  }

  async function getRelation(project: Project, userId: string): Promise<UserProject> {
    return await userProjectRepository.findOne({
      where: {
        userId: userId,
        projectId: project.id
      }
    });
  }

  async function getUserLists(project: Project, userId: string): Promise<Response> {
    return request(app.getHttpServer())
      .get(`/projects/${project.id}/users`)
      .auth("mocked.jwt", {type: "bearer"})
      .set("mocked_user_id", userId);
  }

  describe("Get users of a project", () => {
    afterEach(async () => {
      await userProjectRepository.clear();
      await invitationRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/users`);
      expect(response.status).toEqual(401);
    });

    it("Access to the project", async () => {
      const noAccessResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/users/me`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(noAccessResp.status).toEqual(403);

      // Grant user1 access to the project1
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Owner);
      const accessResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/users/me`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(accessResp.status).toEqual(200);
      expect(accessResp.body.userId).toEqual(TestsHelpers.MOCKED_USER_ID_1);
    });

    it("Get list of users (as the owner)", async () => {
      // Create relation for user1
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Owner);

      const response = await getUserLists(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(200);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("Get list of users and invitations (as the owner)", async () => {
      // Create relation for user1
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Owner);

      const usersCountBeforeInvitation = await getUserLists(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1);
      expect(usersCountBeforeInvitation.status).toEqual(200);
      expect(usersCountBeforeInvitation.body.length).toEqual(1);

      // Invite user2
      const invitationResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(new CreateInvitationDto({
          email: (await userRepository.findOneById(TestsHelpers.MOCKED_USER_ID_2)).email,
          projectId: populatedProjects[0].id,
          role: Role.Manager
        }));
      expect(invitationResp.status).toEqual(201);

      // Check list of users
      const usersCountAfterInvitation = await getUserLists(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1);
      expect(usersCountAfterInvitation.status).toEqual(200);
      expect(usersCountAfterInvitation.body.length).toEqual(2);
    });

    it("Get list of users (as a guest)", async () => {
      // Create relations for user1 and user2
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Owner);
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_2, Role.Manager);

      // Check user1 can see the list of users
      const user1Response = await getUserLists(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1);
      expect(user1Response.status).toEqual(200);
      expect(user1Response.body.length).toEqual(2);

      // Check user2 can also see the list of users
      const user2Response = await getUserLists(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_2);
      expect(user2Response.status).toEqual(200);
      expect(user2Response.body.length).toEqual(2);
    });

    afterAll(async () => {
      await userProjectRepository.clear();
      await invitationRepository.clear();
    });
  });

  describe("Updating role of users", () => {
    afterEach(async () => {
      await userProjectRepository.clear();
    });

    it("No access to the project", async () => {
      const user1NoAccessResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_2}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({role: Role.Manager});
      expect(user1NoAccessResp.status).toEqual(403);

      // Grant user1 access to the project1
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Owner);
      const user2NoAccessResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_2}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({role: Role.Manager});
      expect(user2NoAccessResp.status).toEqual(404);
    });

    it("Changing its own role", async () => {
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Manager);
      const ownRoleChangeResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_1}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({role: Role.Manager});
      expect(ownRoleChangeResp.status).toEqual(403);

      const relation = await getRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1);
      expect(relation).not.toBeNull();
      // Expect the user1 to still have the same role
      expect(relation.role).toEqual(Role.Manager);
    });

    it("Changing the role of the owner", async () => {
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Owner);
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_2, Role.Manager);

      const changeOwnerRoleResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_1}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_2)
        .send({role: Role.Manager});
      expect(changeOwnerRoleResp.status).toEqual(403);

      const relation = await getRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1);
      expect(relation).not.toBeNull();
      // Expect the user1 to still be the owner
      expect(relation.role).toEqual(Role.Owner);
    });

    it("Transferring ownership as a manager", async () => {
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Owner);
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_2, Role.Manager);
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_3, Role.Editor);

      const giveOwnershipResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_3}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_2)
        .send({role: Role.Owner});
      expect(giveOwnershipResp.status).toEqual(403);

      // Expect the user1 to still be the owner
      const user1Relation = await getRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1);
      expect(user1Relation).not.toBeNull();
      expect(user1Relation.role).toEqual(Role.Owner);

      // Expect the user3 to still be an editor
      const user3Relation = await getRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_3);
      expect(user3Relation).not.toBeNull();
      expect(user3Relation.role).toEqual(Role.Editor);
    });

    it("Transferring ownership as the current owner", async () => {
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Owner);
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_2, Role.Manager);

      const giveOwnershipResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_2}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({role: Role.Owner});
      expect(giveOwnershipResp.status).toEqual(200);

      // Expect the user1 to be a manager
      const user1Relation = await getRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1);
      expect(user1Relation).not.toBeNull();
      expect(user1Relation.role).toEqual(Role.Manager);

      // Expect the user2 to be the new owner
      const user2Relation = await getRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_2);
      expect(user2Relation).not.toBeNull();
      expect(user2Relation.role).toEqual(Role.Owner);
    });

    it("Changing role", async () => {
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Owner);
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_2, Role.Manager);

      const changeToEditorResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_2}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({role: Role.Editor});
      expect(changeToEditorResp.status).toEqual(200);

      // Expect the user2 to be editor
      const editorRelation = await getRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_2);
      expect(editorRelation).not.toBeNull();
      expect(editorRelation.role).toEqual(Role.Editor);

      const changeToTranslatorResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_2}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({role: Role.Translator});
      expect(changeToTranslatorResp.status).toEqual(200);

      // Expect the user2 to be translator
      const translatorRelation = await getRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_2);
      expect(translatorRelation).not.toBeNull();
      expect(translatorRelation.role).toEqual(Role.Translator);
    });
  });

  describe("Removing user from project", () => {
    afterEach(async () => {
      await userProjectRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_1}`);
      expect(response.status).toEqual(401);
    });

    it("No access to the project", async () => {
      const noAccessResp = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_2}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(noAccessResp.status).toEqual(403);

      // Grant user1 access to the project1
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Owner);
      const userNoAccessResp = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_2}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(userNoAccessResp.status).toEqual(404);
    });

    it("Deleting itself", async () => {
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Manager);
      const response = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_1}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(405);
    });

    it("Deleting the owner", async () => {
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Owner);
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_2, Role.Manager);

      const response = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_1}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_2);
      expect(response.status).toEqual(403);

      const relation = await getRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1);
      expect(relation).not.toBeNull();
      expect(relation).not.toBeNull();
    });

    it("Deleting a user", async () => {
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Owner);
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_2, Role.Manager);

      const response = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/users/${TestsHelpers.MOCKED_USER_ID_2}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(204);

      const relation = await getRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_2);
      expect(relation).toBeNull();
    });
  });

  describe("Leaving project", () => {
    afterEach(async () => {
      await userProjectRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/leave`);
      expect(response.status).toEqual(401);
    });

    it("No access to the project", async () => {
      const noAccessResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/leave`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(noAccessResp.status).toEqual(403);
    });

    it("Leaving the project as a user (not owner)", async () => {
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Manager);
      const leaveResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/leave`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(leaveResp.status).toEqual(204);

      // Check the relation doesn't exist anymore
      const relation = await getRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1);
      expect(relation).toBeNull();

      // Check the project still exists
      const project = await projectRepository.findOneById(populatedProjects[0].id);
      expect(project).not.toBeNull();
      expect(project).not.toBeNull();
    });

    it("Leaving the project as the owner", async () => {
      await createRelation(populatedProjects[0], TestsHelpers.MOCKED_USER_ID_1, Role.Owner);
      const leaveResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/leave`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(leaveResp.status).toEqual(204);

      // Check the project doesn't exist anymore
      const project = await projectRepository.findOneById(populatedProjects[0].id);
      expect(project).toBeNull();

      // Check all relations have been deleted
      const relations = await userProjectRepository.find({
        where: {
          projectId: populatedProjects[0].id
        }
      });
      expect(relations.length).toEqual(0);
    });
  });
});