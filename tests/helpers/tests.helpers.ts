import Group from "../../src/groups/group.entity";
import {Repository} from "typeorm";
import {Test, TestingModuleBuilder} from "@nestjs/testing";
import UsersModule from "../../src/users/users.module";
import AuthModule from "../../src/auth/auth.module";
import ProjectsModule from "../../src/projects/projects.module";
import TestDatabaseModule from "../database/test-database.module";
import {getRepositoryToken} from "@nestjs/typeorm";
import User from "../../src/users/user.entity";
import Project from "../../src/projects/project.entity";
import UserProject from "../../src/users-projects/user_project.entity";
import Language from "../../src/languages/language.entity";
import TranslationKey from "../../src/translation/translation_key.entity";
import TranslationValue from "../../src/translation/translation_value.entity";
import GroupModule from "../../src/groups/group.module";
import InvitationModule from "../../src/invitations/invitation.module";
import TranslationModule from "../../src/translation/translation.module";
import Role from "../../src/roles/role.enum";
import QuantityString from "../../src/translation/quantity_string.enum";

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
    });
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
   * Create relation between user and project with the provided role
   */
  public static async createProjectRelation(project: Project, user: User, role: Role, userProjectRepository: Repository<UserProject>): Promise<UserProject> {
    const relation = new UserProject();
    relation.user = user;
    relation.project = project;
    relation.role = role;
    return await userProjectRepository.save(relation);
  }

  /**
   * Insert 3 relations in database.
   * - user[0] owner of project[0]
   * - user[0] owner of project[1]
   * - user[1] manager of project[0]
   */
  public static async populateDefaultRelations(users: User[], projects: Project[], userProjectRepository: Repository<UserProject>): Promise<UserProject[]> {
    const relation1 = await TestsHelpers.createProjectRelation(projects[0], users[0], Role.Owner, userProjectRepository);
    const relation2 = await TestsHelpers.createProjectRelation(projects[0], users[1], Role.Manager, userProjectRepository);
    const relation3 = await TestsHelpers.createProjectRelation(projects[1], users[0], Role.Owner, userProjectRepository);
    return [relation1, relation2, relation3];
  }

  /**
   * Insert a group in database
   * */
  public static async createGroup(name: string, project: Project, groupRepository: Repository<Group>): Promise<Group> {
    const group = new Group();
    group.name = name;
    group.project = project;
    return await groupRepository.save(group);
  }

  /**
   * Insert a language in database
   * */
  public static async createLanguage(name: string, project: Project, languageRepository: Repository<Language>): Promise<Language> {
    const language = new Language();
    language.name = name;
    language.project = project;
    return await languageRepository.save(language);
  }

  /**
   * Insert a translation key in database
   * */
  public static async createTranslationKey(name: string, group: Group, project: Project, isPlural: boolean, translationKeysRepository: Repository<TranslationKey>): Promise<TranslationKey> {
    const key = new TranslationKey();
    key.project = project;
    key.group = group;
    key.name = name;
    key.is_plural = isPlural;
    return await translationKeysRepository.save(key);
  }

  /**
   * Insert a translation value in database
   * */
  public static async createTranslationValue(
    value: string,
    key: TranslationKey,
    language: Language,
    quantityString: QuantityString,
    translationValuesRepository: Repository<TranslationValue>
  ): Promise<TranslationValue> {
    const translationValue = new TranslationValue();
    translationValue.key = key;
    translationValue.language = language;
    translationValue.quantity_string = quantityString;
    translationValue.name = value;
    return await translationValuesRepository.save(translationValue);
  }
}