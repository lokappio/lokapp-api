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
import AuthTestsHelpers from "../../auth/auth-tests.helpers";
import ProjectsTestHelpers from "../../projects/projects-test.helpers";
import Role from "../../../src/roles/role.enum";
import Invitation from "../../../src/invitations/invitation.entity";
import InvitationModule from "../../../src/invitations/invitation.module";
import InvitationHelper from "../../helpers/InvitationHelper";
import CreateInvitationDto from "../../../src/invitations/dto/create-invitation.dto";
import UpdateRoleDto from "../../../src/projects/dto/update-role.dto";

describe("Invitations", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let invitationRepository: Repository<Invitation>;

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

  describe("Use case #1", () => {
    const userA = new User("mocked_user_id_1", "username one");
    userA.email = "userA@email.com";

    const userB = new User("mocked_user_id_2", "username two");
    userB.email = "userB@email.com";

    let projectCreated = new Project();
    projectCreated.name = "project_name";
    projectCreated.color = "FFFFFF";

    const userProjectCreated = new UserProject();
    let projectId: number;

    let invitationId: number;

    beforeAll(async () => {
      // Register user
      await userRepository.save(userA);
      await userRepository.save(userB);

      //Create project
      projectCreated = await projectRepository.save(projectCreated);
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
    });

    it("1) UserA gets users of project", async () => {
      const getResult = await ProjectsTestHelpers.getUsersOfProject(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(1);
      expect(getResult.body).toEqual([{
        userId: userA.id,
        username: userA.username,
        email: userA.email,
        role: Role.Owner,
        pending: false,
        invitationId: null
      }]);
    });

    //invitation
    it("2) UserA invite userB on project", async () => {
      const invitation = new CreateInvitationDto({
        email: userB.email,
        role: Role.Translator,
        project_id: projectCreated.id
      });
      const createResult = await InvitationHelper.createInvitation(app, userA.id, invitation);
      expect(createResult.status).toBe(201);
      expect(createResult.body).toEqual({
        guest: {
          ...userB,
          created_at: expect.any(String),
          updated_at: expect.any(String)
        },
        owner: {
          ...userA,
          created_at: expect.any(String),
          updated_at: expect.any(String)
        },
        project: {
          ...projectCreated,
          created_at: expect.any(String),
          updated_at: expect.any(String)
        },
        role: invitation.role,
        projectId: projectId,
        ownerId: userA.id,
        guestId: userB.id,
        id: expect.any(Number),
        created_at: expect.any(String)
      });
      invitationId = createResult.body.id;
    });

    it("3) UserB list his own invitations", async () => {
      const getResult = await InvitationHelper.getUserInvitations(app, userB.id);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(1);
      expect(getResult.body).toEqual([{
        role: Role.Translator,
        id: expect.any(Number),
        owner_email: userA.email,
        owner_username: userA.username,
        project_name: projectCreated.name
      }]);
    });

    it("4) UserA gets users of project", async () => {
      const getResult = await ProjectsTestHelpers.getUsersOfProject(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(2);
      expect(getResult.body).toEqual([
        {
          userId: userA.id,
          username: userA.username,
          email: userA.email,
          role: Role.Owner,
          pending: false,
          invitationId: null
        },
        {
          userId: userB.id,
          username: userB.username,
          email: userB.email,
          role: Role.Translator,
          pending: true,
          invitationId: invitationId
        }
      ]);
    });

    //delete invitation
    it("5) UserA delete invitation", async () => {
      const deleteResult = await InvitationHelper.deleteInvitation(app, userA.id, projectId, invitationId);
      expect(deleteResult.status).toBe(204);
    });

    it("6) UserB list his own invitations", async () => {
      const getResult = await InvitationHelper.getUserInvitations(app, userB.id);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(0);
    });

    it("7) UserA gets users of project", async () => {
      const getResult = await ProjectsTestHelpers.getUsersOfProject(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(1);
      expect(getResult.body).toEqual([{
        userId: userA.id,
        username: userA.username,
        email: userA.email,
        role: Role.Owner,
        pending: false,
        invitationId: null
      }]);
    });

    //Check if project is displayed on userB list (should not)
    it("8) UserA invite userB on project", async () => {
      const invitation = new CreateInvitationDto({
        email: userB.email,
        role: Role.Translator,
        project_id: projectCreated.id
      });
      const createResult = await InvitationHelper.createInvitation(app, userA.id, invitation);
      expect(createResult.status).toBe(201);
      invitationId = createResult.body.id;
    });

    it("9) UserB list his projects", async () => {
      const getResult = await ProjectsTestHelpers.getUserProjects(app, userB.id);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(0);
    });

    //Decline invitation
    it("10) UserB decline invitation", async () => {
      const declineResult = await InvitationHelper.declineInvitation(app, userB.id, invitationId);
      expect(declineResult.status).toBe(201);
    });

    it("11) UserB list his own invitations", async () => {
      const getResult = await InvitationHelper.getUserInvitations(app, userB.id);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(0);
    });

    it("12) UserA gets users of project", async () => {
      const getResult = await ProjectsTestHelpers.getUsersOfProject(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(1);
      expect(getResult.body).toEqual([{
        userId: userA.id,
        username: userA.username,
        email: userA.email,
        role: Role.Owner,
        pending: false,
        invitationId: null
      }]);
    });

    //Accept invitation
    it("13) UserA invite userB on project", async () => {
      const invitation = new CreateInvitationDto({
        email: userB.email,
        role: Role.Translator,
        project_id: projectCreated.id
      });
      const createResult = await InvitationHelper.createInvitation(app, userA.id, invitation);
      expect(createResult.status).toBe(201);
      invitationId = createResult.body.id;
    });

    it("14) UserB accept invitation", async () => {
      const acceptResult = await InvitationHelper.acceptInvitation(app, userB.id, invitationId);
      expect(acceptResult.status).toBe(201);
    });

    it("15) UserB list his own invitations", async () => {
      const getResult = await InvitationHelper.getUserInvitations(app, userB.id);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(0);
    });

    it("16) UserB list his projects", async () => {
      const getResult = await ProjectsTestHelpers.getUserProjects(app, userB.id);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(1);
      expect(getResult.body).toEqual([{
        ...projectCreated,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      }]);
    });

    it("17) UserA gets users of project", async () => {
      const getResult = await ProjectsTestHelpers.getUsersOfProject(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(2);
      expect(getResult.body).toEqual([
        {
          userId: userA.id,
          username: userA.username,
          email: userA.email,
          role: Role.Owner,
          pending: false,
          invitationId: null
        },
        {
          userId: userB.id,
          username: userB.username,
          email: userB.email,
          role: Role.Translator,
          pending: false,
          invitationId: null
        }
      ]);
    });

    //update role of userB into Manager
    it("18) UserA update role of UserB into manager", async () => {
      const updateRoleDto = new UpdateRoleDto({
        role: Role.Manager
      });
      const updateResult = await ProjectsTestHelpers.updateUserRole(app, userA.id, projectCreated.id, userB.id, updateRoleDto);
      expect(updateResult.status).toBe(200);
    });

    it("19) UserA gets users of project", async () => {
      const getResult = await ProjectsTestHelpers.getUsersOfProject(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(2);
      expect(getResult.body).toEqual([
        {
          userId: userA.id,
          username: userA.username,
          email: userA.email,
          role: Role.Owner,
          pending: false,
          invitationId: null
        },
        {
          userId: userB.id,
          username: userB.username,
          email: userB.email,
          role: Role.Manager,
          pending: false,
          invitationId: null
        }
      ]);
    });

    //update role of userB into Owner
    it("20) UserA update role of UserB into Owner", async () => {
      const updateRoleDto = new UpdateRoleDto({
        role: Role.Owner
      });
      const updateResult = await ProjectsTestHelpers.updateUserRole(app, userA.id, projectCreated.id, userB.id, updateRoleDto);
      expect(updateResult.status).toBe(200);
    });

    it("21) UserA gets users of project", async () => {
      const getResult = await ProjectsTestHelpers.getUsersOfProject(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(2);
      expect(getResult.body).toEqual([
        {
          userId: userA.id,
          username: userA.username,
          email: userA.email,
          role: Role.Manager,
          pending: false,
          invitationId: null
        },
        {
          userId: userB.id,
          username: userB.username,
          email: userB.email,
          role: Role.Owner,
          pending: false,
          invitationId: null
        }
      ]);
    });

    //update role of userB into Owner
    it("22) UserB update role of UserA into Owner", async () => {
      const updateRoleDto = new UpdateRoleDto({
        role: Role.Owner
      });
      const updateResult = await ProjectsTestHelpers.updateUserRole(app, userB.id, projectCreated.id, userA.id, updateRoleDto);
      expect(updateResult.status).toBe(200);
    });

    //Remove user from project
    it("23) UserA remove UserB from project", async () => {
      const deleteResult = await ProjectsTestHelpers.removeUserFromProject(app, userA.id, projectCreated.id, userB.id);
      expect(deleteResult.status).toBe(204);
    });

    it("24) UserA gets users of project", async () => {
      const getResult = await ProjectsTestHelpers.getUsersOfProject(app, userA.id, projectId);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(1);
      expect(getResult.body).toEqual([{
        userId: userA.id,
        username: userA.username,
        email: userA.email,
        role: Role.Owner,
        pending: false,
        invitationId: null
      }]);
    });

    it("25) UserB list his projects", async () => {
      const getResult = await ProjectsTestHelpers.getUserProjects(app, userB.id);
      expect(getResult.status).toBe(200);
      expect(getResult.body.length).toBe(0);
    });
  });
});