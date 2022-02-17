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
import Role from "../../src/roles/role.enum";
import Invitation from "../../src/invitations/invitation.entity";
import CreateInvitationDto from "../../src/invitations/dto/create-invitation.dto";
import TestsHelpers from "../helpers/tests.helpers";
import * as request from "supertest";

describe("Invitations", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let invitationRepository: Repository<Invitation>;

  let populatedProjects: Project[];

  async function removeProjectsRelations(userId: string, userProjectRepository: Repository<UserProject>): Promise<void> {
    const relations = await userProjectRepository.find({
      where: {
        userId: userId
      }
    });
    for (const relation of relations) {
      await userProjectRepository.remove(relation);
    }
  }

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

    const populatedUsers = await TestsHelpers.populateUsers(userRepository);
    populatedProjects = await TestsHelpers.populateProjects(projectRepository);
    await TestsHelpers.populateDefaultRelations(populatedUsers, populatedProjects, userProjectRepository);
  });

  afterAll(async () => {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await invitationRepository.clear();
    await app.close();
  });

  describe("Create invitations", () => {
    afterEach(async () => {
      // Remove all projects relations of the mocked user 3
      await removeProjectsRelations(TestsHelpers.MOCKED_USER_ID_3, userProjectRepository);
    });

    it("Unauthenticated user", async () => {
      const invitationResp = await request(app.getHttpServer())
        .post("/invitations");
      expect(invitationResp.status).toEqual(401);
    });

    it("Creating invitation with DTO errors", async () => {
      const noEmailResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({projectId: populatedProjects[0].id, role: Role.Manager});
      expect(noEmailResp.status).toEqual(400);
      expect(noEmailResp.body.message).toBe("Validation failed");

      const noProjectIdResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({email: "user@lokapp.io", role: Role.Manager});
      expect(noProjectIdResp.status).toEqual(403);

      const noRoleResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({email: "user@lokapp.io", projectId: populatedProjects[0].id});
      expect(noRoleResp.status).toEqual(400);
      expect(noRoleResp.body.message).toBe("Validation failed");

      const inviteOwnerResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({email: "user@lokapp.io", projectId: populatedProjects[0].id, role: Role.Owner});
      expect(inviteOwnerResp.status).toEqual(400);
      expect(inviteOwnerResp.body.message).toBe("Validation failed");

      const noDataResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({});
      expect(noDataResp.status).toEqual(403);
    });

    it("Inviting a user that does not exist", async () => {
      const notFoundEmailResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({email: "not_found@lokapp.io", projectId: populatedProjects[0].id, role: Role.Manager});
      expect(notFoundEmailResp.status).toEqual(404);
    });

    it("Create an invitation as the owner", async () => {
      const invitationResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(new CreateInvitationDto({
          email: "user_c@lokapp.io",
          projectId: populatedProjects[0].id,
          role: Role.Manager
        }));
      expect(invitationResp.status).toEqual(201);
    });
  });

  describe("Pending invitations", () => {
    afterEach(async () => {
      await invitationRepository.clear();
      await removeProjectsRelations(TestsHelpers.MOCKED_USER_ID_3, userProjectRepository);
    });

    it("Unauthenticated user", async () => {
      const invitationResp = await request(app.getHttpServer())
        .get("/invitations");
      expect(invitationResp.status).toEqual(401);
    });

    it("As a guest, list invitations", async () => {
      const emptyInvitationsResp = await request(app.getHttpServer())
        .get("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(emptyInvitationsResp.status).toEqual(200);
      expect(emptyInvitationsResp.body.length).toEqual(0);

      // Create invitation
      const invitationResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(new CreateInvitationDto({
          email: "user_c@lokapp.io", // Email of mocked user 3
          projectId: populatedProjects[0].id,
          role: Role.Manager
        }));
      expect(invitationResp.status).toEqual(201);

      // Check list of invitations
      const invitationsResp = await request(app.getHttpServer())
        .get("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(invitationsResp.status).toEqual(200);
      expect(invitationsResp.body.length).toEqual(1);
    });

    it("As a guest, accept invitation", async () => {
      const dto = new CreateInvitationDto({
        email: "user_c@lokapp.io", // Email of mocked user 3
        projectId: populatedProjects[0].id,
        role: Role.Editor
      });

      // Create invitation
      const invitationResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(dto);
      expect(invitationResp.status).toEqual(201);

      // Accept invitation
      const acceptInvitation = await request(app.getHttpServer())
        .post(`/invitations/${invitationResp.body.id}/accept`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(acceptInvitation.status).toEqual(201);

      // Get project's relation and check the user 3 has access to the project
      const projectRelation = await userProjectRepository.findOne({
        where: {
          projectId: dto.projectId,
          userId: TestsHelpers.MOCKED_USER_ID_3
        }
      });
      expect(projectRelation).not.toBeUndefined();
      expect(projectRelation).not.toBeNull();
      expect(projectRelation.role).toEqual(dto.role);

      const remainingInvitations = await invitationRepository.find({
        where: {
          guestId: TestsHelpers.MOCKED_USER_ID_3
        }
      });
      expect(remainingInvitations.length).toEqual(0);
    });

    it("As a guest, decline invitation", async () => {
      const dto = new CreateInvitationDto({
        email: "user_c@lokapp.io",
        projectId: populatedProjects[0].id,
        role: Role.Manager
      });

      // Create invitation
      const invitationResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(dto);
      expect(invitationResp.status).toEqual(201);

      // Decline invitation
      const declineInvitation = await request(app.getHttpServer())
        .post(`/invitations/${invitationResp.body.id}/decline`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(declineInvitation.status).toEqual(201);

      // Get project's relation and check the user 3 hasn't access to the project
      const projectRelation = await userProjectRepository.findOne({
        where: {
          projectId: dto.projectId,
          userId: TestsHelpers.MOCKED_USER_ID_3
        }
      });
      expect(projectRelation).toBeUndefined();

      const remainingInvitations = await invitationRepository.find({
        where: {
          guestId: TestsHelpers.MOCKED_USER_ID_3
        }
      });
      expect(remainingInvitations.length).toEqual(0);
    });

    it("Only a guest can accept or decline an invitation", async () => {
      const dto = new CreateInvitationDto({
        email: "user_c@lokapp.io", // Email of mocked user 3
        projectId: populatedProjects[0].id,
        role: Role.Translator
      });

      // Create invitation
      const invitationResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(dto);
      expect(invitationResp.status).toEqual(201);

      // Try to accept invitation as user2
      const acceptInvitation = await request(app.getHttpServer())
        .post(`/invitations/${invitationResp.body.id}/accept`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_2);
      expect(acceptInvitation.status).toEqual(403);

      // Try to decline invitation as user2
      const declineInvitation = await request(app.getHttpServer())
        .post(`/invitations/${invitationResp.body.id}/decline`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_2);
      expect(declineInvitation.status).toEqual(403);

      const remainingInvitations = await invitationRepository.find({
        where: {
          guestId: TestsHelpers.MOCKED_USER_ID_3
        }
      });
      expect(remainingInvitations.length).toEqual(1);
    });
  });

  describe("Deleting invitations", () => {
    afterEach(async () => {
      await invitationRepository.clear();
      await removeProjectsRelations(TestsHelpers.MOCKED_USER_ID_2, userProjectRepository);
    });

    it("As the owner, cancel invitation", async () => {
      // Create invitation
      const invitationResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          email: "user_c@lokapp.io", // Email of mocked user 3
          projectId: populatedProjects[0].id,
          role: Role.Translator
        });
      expect(invitationResp.status).toEqual(201);

      // Delete invitation
      const deleteInvitationResp = await request(app.getHttpServer())
        .delete(`/invitations/${invitationResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(deleteInvitationResp.status).toEqual(204);
    });

    it("As a guest, try to delete invitation", async () => {
      // Create invitation
      const invitationResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          email: "user_c@lokapp.io", // Email of mocked user 3
          projectId: populatedProjects[0].id,
          role: Role.Translator
        });
      expect(invitationResp.status).toEqual(201);

      // Try to delete invitation
      const deleteInvitationResp = await request(app.getHttpServer())
        .delete(`/invitations/${invitationResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(deleteInvitationResp.status).toEqual(403);
    });

    it("As another member of the project, try to delete invitation", async () => {
      // Add user2 into the project
      const relation = new UserProject();
      relation.project = populatedProjects[0];
      relation.user = await userRepository.findOne(TestsHelpers.MOCKED_USER_ID_2);
      relation.role = Role.Manager;
      await userProjectRepository.save(relation);

      // Create invitation as user1
      const invitationResp = await request(app.getHttpServer())
        .post("/invitations")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          email: "user_c@lokapp.io", // Email of mocked user 3
          projectId: populatedProjects[0].id,
          role: Role.Translator
        });
      expect(invitationResp.status).toEqual(201);

      // Try to delete invitation as user 2
      const deleteInvitationResp = await request(app.getHttpServer())
        .delete(`/invitations/${invitationResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_2);
      expect(deleteInvitationResp.status).toEqual(403);
    });
  });
});