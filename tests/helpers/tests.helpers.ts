import Group from "../../src/groups/group.entity";
import { Repository } from "typeorm";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import CreateGroupDto from "../../src/groups/dto/create-group.dto";
import UpdateGroupDto from "../../src/groups/dto/update-group.dto";
import {Test, TestingModule, TestingModuleBuilder} from "@nestjs/testing";
import UsersModule from "../../src/users/users.module";
import AuthModule from "../../src/auth/auth.module";
import ProjectsModule from "../../src/projects/projects.module";
import TestDatabaseModule from "../database/test-database.module";
import {getRepositoryToken} from "@nestjs/typeorm";
import User from "../../src/users/user.entity";
import Project from "../../src/projects/project.entity";
import UserProject from "../../src/users-projects/user_project.entity";
import {JwtAuthUserGuard} from "../../src/auth/guards/jwt-auth-user.guard";
import {mockedAuthGuard} from "../common/mocked-auth-guard";
import Language from "../../src/languages/language.entity";
import TranslationKey from "../../src/translation/translation_key.entity";
import TranslationValue from "../../src/translation/translation_value.entity";
import GroupModule from "../../src/groups/group.module";
import InvitationModule from "../../src/invitations/invitation.module";
import TranslationModule from "../../src/translation/translation.module";
import Role from "../../src/roles/role.enum";
import ProjectsTestHelpers from "../projects/projects-test.helpers";

export default class TestsHelpers {
  public static getTestingModule(): TestingModuleBuilder {
    return Test.createTestingModule({
      imports: [
        UsersModule,
        AuthModule,
        ProjectsModule,
        GroupModule,
        InvitationModule,
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
          provide: getRepositoryToken(Language),
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
          provide: getRepositoryToken(Group),
          useClass: Repository
        }
      ]
    })
  }

  public static readonly MOCKED_USER_ID_1 = "mocked_user_id_1";
  public static readonly MOCKED_USER_ID_2 = "mocked_user_id_2";
  public static readonly MOCKED_USER_ID_3 = "mocked_user_id_3";

  /**
   * Insert 2 users in database ([Ø] mocked_user_id_1 and [1] mocked_user_id_2)
   * @param userRepository the Repository<User> where saving test users
   */
  public static async populateUsers(userRepository: Repository<User>): Promise<User[]> {
    const userA = new User(TestsHelpers.MOCKED_USER_ID_1, "username #1");
    userA.email = "user_a@lokapp.io";
    await userRepository.save(userA);

    const userB = new User(TestsHelpers.MOCKED_USER_ID_2, "username #2");
    userB.email = "user_b@lokapp.io";
    await userRepository.save(userB);

    const userC = new User(TestsHelpers.MOCKED_USER_ID_3, "username #3");
    userC.email = "user_c@lokapp.io";
    await userRepository.save(userC);

    return [userA, userB, userC];
  }

  /**
   * Insert 3 projects in database
   * @param projectRepository the Repository<Project> where saving test projects
   */
  public static async populateProjects(projectRepository: Repository<Project>): Promise<Project[]> {
    const project1 = new Project();
    project1.name = "Project #1 of userA";
    project1.description = "Project #1 of userA";
    project1.color = "112233";
    await projectRepository.save(project1);

    const project2 = new Project();
    project2.name = "Project #2 of userA";
    project2.description = "Project #2 of userA";
    project2.color = "112233";
    await projectRepository.save(project2);

    const project3 = new Project();
    project3.name = "Project #1 of userB";
    project3.description = "Project #1 of userB";
    project3.color = "112233";
    await projectRepository.save(project3);

    return [project1, project2, project3];
  }

  /**
   * Insert 2 users in database ([Ø] mocked_user_id_1 and [1] mocked_user_id_2),
   * 3 projects and 3 relations: projects[0] and projects[1] owned by mocked_user_id_1
   * and projects[2] owned by mocked_user_id_2.
   * @param usersRepository the Repository<User> where saving test users
   * @param projectsRepository the Repository<Project> where saving test projects
   * @param userProjectRepository the Repository<UserProject> where saving relations between users and projects
   */
  public static async populateUsersAndProjects(
    usersRepository: Repository<User>,
    projectsRepository: Repository<Project>,
    userProjectRepository: Repository<UserProject>
  ): Promise<{ projects: Project[]; relations: UserProject[]; users: User[] }> {
    const users = await TestsHelpers.populateUsers(usersRepository);
    const projects = await TestsHelpers.populateProjects(projectsRepository);

    const relation1 = new UserProject();
    relation1.project = projects[0];
    relation1.user = users[0];
    relation1.role = Role.Owner;
    await userProjectRepository.save(relation1);

    const relation2 = new UserProject();
    relation2.project = projects[1];
    relation2.user = users[0];
    relation2.role = Role.Owner;
    await userProjectRepository.save(relation2);

    const relation3 = new UserProject();
    relation3.project = projects[2];
    relation3.user = users[1];
    relation3.role = Role.Owner;
    await userProjectRepository.save(relation3);

    return {users: users, projects: projects, relations: [relation1, relation2, relation3]};
  }
}