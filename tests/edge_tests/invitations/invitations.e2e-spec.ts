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
import Invitation from "../../../src/invitations/invitation.entity";
import InvitationModule from "../../../src/invitations/invitation.module";
import CreateInvitationDto from "../../../src/invitations/dto/create-invitation.dto";
import InvitationHelper from "../../helpers/InvitationHelper";
import UpdateRoleDto from "src/projects/dto/update-role.dto";

describe("Invitation edge", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let invitationRepository: Repository<Invitation>;

  const userAId = "user_1_ID";
  const userBId = "user_2_ID";

  const userA = new User(userAId, "userA");
  const userB = new User(userBId, "UserB");

  let projectA = new Project();
  const projectB = new Project();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        UsersModule,
        AuthModule,
        ProjectsModule,
        InvitationModule,
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
          provide: getRepositoryToken(Invitation),
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
    invitationRepository = moduleRef.get<Repository<Invitation>>(getRepositoryToken(Invitation));

    //Setup users
    userA.email = "usera@email.com";
    userB.email = "userb@email.com";
    await AuthHelper.dbAddUser(userRepository, userA);
    await AuthHelper.dbAddUser(userRepository, userB);

    //Setup projects
    projectA.name = "project name";
    projectA.color = "FFFFFF";
    projectA = await ProjectHelper.dbAddProject(projectRepository, projectA);
    const relation = new UserProject();
    relation.project = projectA;
    relation.user = userA;
    relation.role = Role.Owner;
    await ProjectHelper.dbAddUserProjectRelation(userProjectRepository, relation);

    projectB.name = "project nameB";
    projectB.color = "FFFFFF";
    await ProjectHelper.dbAddProject(projectRepository, projectB);
    const relation2 = new UserProject();
    relation2.project = projectB;
    relation2.user = userA;
    relation2.role = Role.Owner;
    await ProjectHelper.dbAddUserProjectRelation(userProjectRepository, relation2);

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await invitationRepository.clear();
    await app.close();
  });

  beforeEach(async () => {
    await invitationRepository.clear();
  });

  describe("User lists users of project", () => {
    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${projectA.id}/users`);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/123456/users`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id);
      await EdgeHelper.entityNotFound(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .get(`/projects/${projectA.id}/users`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userB.id);
      await EdgeHelper.entityNotReachable(req);
    });
  });

  describe("User invite another user on project", () => {
    let createInvitationDto: CreateInvitationDto;

    beforeEach(async () => {
      createInvitationDto = new CreateInvitationDto({
        email: userB.email,
        role: Role.Manager,
        project_id: projectA.id
      });
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .post(`/invitations`)
        .send(createInvitationDto);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const dto = new CreateInvitationDto({
        email: userB.email,
        role: Role.Manager,
        project_id: 123456
      });
      const req = request(app.getHttpServer())
        .post(`/invitations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send(dto);
      await EdgeHelper.roleGuardError(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .post(`/invitations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userB.id)
        .send(createInvitationDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("Target email unknown", async () => {
      const dto = new CreateInvitationDto({
        email: "unknowemail@gmail.com",
        role: Role.Manager,
        project_id: projectA.id
      });
      const req = request(app.getHttpServer())
        .post(`/invitations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send(dto);
      await EdgeHelper.entityNotFound(req);
    });

    it("Target already on project", async () => {
      const relation = new UserProject();
      relation.project = projectA;
      relation.user = userB;
      relation.role = Role.Translator;
      await ProjectHelper.dbAddUserProjectRelation(userProjectRepository, relation);

      const req = request(app.getHttpServer())
        .post(`/invitations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send(createInvitationDto);
      await EdgeHelper.unauthorized(req);

      const toDelete = await userProjectRepository.findOne({
        where: {
          user: userB,
          project: projectA
        }
      });
      await userProjectRepository.delete(toDelete);
    });

    it("Invitation already sended", async () => {
      const req = await request(app.getHttpServer())
        .post(`/invitations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send(createInvitationDto);
      expect(req.status).toBe(201);

      const req2 = request(app.getHttpServer())
        .post(`/invitations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send(createInvitationDto);
      await EdgeHelper.entityAlreadyExists(req2);

      await invitationRepository.clear();
    });

    it("Wrong DTO on request", async () => {
      const req = request(app.getHttpServer())
        .post(`/invitations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send({project_id: projectA.id});
      await EdgeHelper.requestWithInvalidDto(req);

      const req2 = request(app.getHttpServer())
        .post(`/invitations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send({email: userB.id, project_id: projectA.id, role: null});
      await EdgeHelper.requestWithInvalidDto(req2);

      const req3 = request(app.getHttpServer())
        .post(`/invitations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send({email: userB.id, project_id: projectA.id, role: Role.Owner});
      await EdgeHelper.requestWithInvalidDto(req3);
    });
  });

  describe("User lists his own invitations", () => {
    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .get("/invitations");
      await EdgeHelper.requestWithoutJWT(req);
    });
  });

  describe("Delete invitation", () => {
    let invitation = new Invitation();

    beforeEach(async () => {
      await invitationRepository.clear();
      invitation = await InvitationHelper.dbAddInvitation(invitationRepository, projectA, userB, userA, Role.Manager);
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .delete(`/invitations/${invitation.id}`)
        .send({"project_id": projectA.id});
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .delete(`/invitations/${invitation.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send({"project_id": 123456});
      await EdgeHelper.roleGuardError(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .delete(`/invitations/${invitation.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userB.id)
        .send({"project_id": projectA.id});
      await EdgeHelper.roleGuardError(req);
    });

    it("InvitationID not found", async () => {
      const req = request(app.getHttpServer())
        .delete(`/invitations/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send({"project_id": projectA.id});
      await EdgeHelper.entityNotFound(req);
    });

    it("InvitationID not link to projectID", async () => {
      const req = request(app.getHttpServer())
        .delete(`/invitations/${invitation.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send({"project_id": projectB.id});
      await EdgeHelper.unauthorized(req);
    });
  });

  describe("User refuses invitation", () => {
    let invitation = new Invitation();

    beforeEach(async () => {
      await invitationRepository.clear();
      invitation = await InvitationHelper.dbAddInvitation(invitationRepository, projectA, userB, userA, Role.Manager);
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .post(`/invitations/${invitation.id}/decline`);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("InvitationID not found", async () => {
      const req = request(app.getHttpServer())
        .post(`/invitations/123456/decline`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userB.id);
      await EdgeHelper.entityNotFound(req);
    });

    it("InvitationID not owned", async () => {
      const req = request(app.getHttpServer())
        .post(`/invitations/${invitation.id}/decline`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id);
      await EdgeHelper.unauthorized(req);
    });
  });

  describe("User accepts invitation", () => {
    let invitation = new Invitation();

    beforeEach(async () => {
      await invitationRepository.clear();
      invitation = await InvitationHelper.dbAddInvitation(invitationRepository, projectA, userB, userA, Role.Manager);
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .post(`/invitations/${invitation.id}/accept`);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("InvitationID not found", async () => {
      const req = request(app.getHttpServer())
        .post(`/invitations/123456/accept`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userB.id);
      await EdgeHelper.entityNotFound(req);
    });

    it("InvitationID not owned", async () => {
      const req = request(app.getHttpServer())
        .post(`/invitations/${invitation.id}/accept`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id);
      await EdgeHelper.unauthorized(req);
    });
  });

  describe("UserA update role of userB", () => {
    let updateRoleDto: UpdateRoleDto;

    beforeEach(async () => {
      const findUserB = await userProjectRepository.findOne({
        where: {
          projectId: projectA.id,
          userId: userB.id
        }
      });
      if (findUserB) {
        await userProjectRepository.delete(findUserB);
      }
      const relation = new UserProject();
      relation.project = projectA;
      relation.user = userB;
      relation.role = Role.Translator;
      await ProjectHelper.dbAddUserProjectRelation(userProjectRepository, relation);

      updateRoleDto = {
        role: Role.Manager
      };
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectA.id}/users/${userB.id}`)
        .send(updateRoleDto);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("ProjectID not found", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/123456/users/${userB.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send(updateRoleDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("ProjectID not owned by user", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectA.id}/users/${userB.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", "123456")
        .send(updateRoleDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("TargetID not found", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectA.id}/users/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send(updateRoleDto);
      await EdgeHelper.entityNotFound(req);
    });

    it("TargetID not on project", async () => {
      //Remove user
      const findUserB = await userProjectRepository.findOne({
        where: {
          projectId: projectA.id,
          userId: userB.id
        }
      });
      if (findUserB) {
        await userProjectRepository.delete(findUserB);
      }

      const req = request(app.getHttpServer())
        .patch(`/projects/${projectA.id}/users/${userB.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send(updateRoleDto);
      await EdgeHelper.entityNotFound(req);
    });

    it("TargetID is the same as UserID", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectA.id}/users/${userA.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send(updateRoleDto);
      await EdgeHelper.unauthorized(req);
    });

    it("Wrong DTO on request", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectA.id}/users/${userB.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id);
      await EdgeHelper.requestWithInvalidDto(req);

      const req2 = request(app.getHttpServer())
        .patch(`/projects/${projectA.id}/users/${userB.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send({});
      await EdgeHelper.requestWithInvalidDto(req2);

      const req3 = request(app.getHttpServer())
        .patch(`/projects/${projectA.id}/users/${userB.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send({role: null});
      await EdgeHelper.requestWithInvalidDto(req3);

      const req4 = request(app.getHttpServer())
        .patch(`/projects/${projectA.id}/users/${userB.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id)
        .send({role: "the_role"});
      await EdgeHelper.requestWithInvalidDto(req4);
    });

    it("TargetID has a more important role than UserID", async () => {
      //Update userB to Manager
      const findUserB = await userProjectRepository.findOne({
        where: {
          projectId: projectA.id,
          userId: userB.id
        }
      });
      if (findUserB) {
        findUserB.role = Role.Manager;
        await userProjectRepository.save(findUserB);
      }

      const req = request(app.getHttpServer())
        .patch(`/projects/${projectA.id}/users/${userA.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userB.id)
        .send({role: Role.Manager});
      await EdgeHelper.unauthorized(req);

      const req2 = request(app.getHttpServer())
        .patch(`/projects/${projectA.id}/users/${userA.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userB.id)
        .send({role: Role.Owner});
      await EdgeHelper.unauthorized(req2);
    });
  });

  describe("Remove user from project", () => {
    beforeEach(async () => {
      const findUserB = await userProjectRepository.findOne({
        where: {
          projectId: projectA.id,
          userId: userB.id
        }
      });
      if (findUserB) {
        await userProjectRepository.delete(findUserB);
      }
      const relation = new UserProject();
      relation.project = projectA;
      relation.user = userB;
      relation.role = Role.Translator;
      await ProjectHelper.dbAddUserProjectRelation(userProjectRepository, relation);
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectA.id}/users/${userB.id}`);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("ProjectID not found", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/123456/users/${userB.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id);
      await EdgeHelper.roleGuardError(req);
    });

    it("ProjectID not owned by user", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectA.id}/users/${userB.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", "123456");
      await EdgeHelper.roleGuardError(req);
    });

    it("TargetID not found", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectA.id}/users/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id);
      await EdgeHelper.entityNotFound(req);
    });

    it("TargetID not on project", async () => {
      //Remove user
      const findUserB = await userProjectRepository.findOne({
        where: {
          projectId: projectA.id,
          userId: userB.id
        }
      });
      if (findUserB) {
        await userProjectRepository.delete(findUserB);
      }

      const req = request(app.getHttpServer())
        .delete(`/projects/${projectA.id}/users/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id);
      await EdgeHelper.entityNotFound(req);
    });

    it("TargetID is the same as UserID", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectA.id}/users/${userA.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userA.id);
      await EdgeHelper.unauthorized(req);
    });

    it("TargetID has a more important role than userID", async () => {
      //Update userB to manager
      const findUserB = await userProjectRepository.findOne({
        where: {
          projectId: projectA.id,
          userId: userB.id
        }
      });
      if (findUserB) {
        findUserB.role = Role.Manager;
        await userProjectRepository.save(findUserB);
      }

      const req = request(app.getHttpServer())
        .delete(`/projects/${projectA.id}/users/${userA.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userB.id);
      await EdgeHelper.unauthorized(req);
    });
  });
});