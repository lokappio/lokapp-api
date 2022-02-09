import {INestApplication} from "@nestjs/common";
import {Test} from "@nestjs/testing";
import {getRepositoryToken} from "@nestjs/typeorm";
import AuthModule from "../../../src/auth/auth.module";
import {JwtAuthUserGuard} from "../../../src/auth/guards/jwt-auth-user.guard";
import {HttpExceptionFilter} from "../../../src/common/http-error.filter";
import CreateGroupDto from "../../../src/groups/dto/create-group.dto";
import UpdateGroupDto from "../../../src/groups/dto/update-group.dto";
import Group, {DefaultGroupName} from "../../../src/groups/group.entity";
import CreateInvitationDto from "../../../src/invitations/dto/create-invitation.dto";
import Invitation from "../../../src/invitations/invitation.entity";
import Language from "../../../src/languages/language.entity";
import Project from "../../../src/projects/project.entity";
import ProjectsModule from "../../../src/projects/projects.module";
import Role from "../../../src/roles/role.enum";
import TranslationKey from "../../../src/translation/translation_key.entity";
import TranslationValue from "../../../src/translation/translation_value.entity";
import UserProject from "../../../src/users-projects/user_project.entity";
import User from "../../../src/users/user.entity";
import UsersModule from "../../../src/users/users.module";
import {mockedAuthGuard} from "../../common/mocked-auth-guard";
import {TestQueryExceptionFilter} from "../../common/test-query-error.filter";
import TestDatabaseModule from "../../database/test-database.module";
import AuthTestsHelpers from "../../auth/auth-tests.helpers";
import EdgeHelper from "../../helpers/EdgeHelper";
import GroupHelper from "../../helpers/GroupHelper";
import InvitationHelper from "../../helpers/InvitationHelper";
import ProjectsTestHelpers from "../../projects/projects-test.helpers";
import {Repository} from "typeorm";
import GroupModule from "../../../src/groups/group.module";
import InvitationModule from "../../../src/invitations/invitation.module";
import TranslationModule from "../../../src/translation/translation.module";
import CreateKeyDto from "../../../src/translation/dto/create-key.dto";
import KeyHelper from "../../helpers/KeyHelper";
import UpdateKeyDto from "../../../src/translation/dto/update-key.dto";
import CreateLanguageDto from "../../../src/projects/dto/create-language.dto";
import LanguageHelper from "../../helpers/LanguageHelper";
import UpdateProjectDto from "../../../src/projects/dto/update-project.dto";
import CreateValueDto from "../../../src/translation/dto/create-value.dto";
import ValueHelper from "../../helpers/ValueHelper";
import UpdateValueDto from "../../../src/translation/dto/update-value.dto";
import UpdateRoleDto from "../../../src/projects/dto/update-role.dto";


describe("Tests EDITOR", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let languageRepository: Repository<Language>;
  let groupRepository: Repository<Group>;
  let invitationRepository: Repository<Invitation>;
  let keyRepository: Repository<TranslationKey>;
  let valueRepository: Repository<TranslationValue>;

  const admin = new User("admin_id", "userA");
  const tester = new User("tester_id", "userB");

  let project = new Project();
  let defaultGroup = new Group();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
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
          provide: getRepositoryToken(Group),
          useClass: Repository
        },
        {
          provide: getRepositoryToken(Invitation),
          useClass: Repository
        },
        {
          provide: getRepositoryToken(TranslationKey),
          useClass: Repository
        },
        {
          provide: getRepositoryToken(TranslationValue),
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
    languageRepository = moduleRef.get<Repository<Language>>(getRepositoryToken(Language));
    groupRepository = moduleRef.get<Repository<Group>>(getRepositoryToken(Group));
    invitationRepository = moduleRef.get<Repository<Invitation>>(getRepositoryToken(Invitation));
    keyRepository = moduleRef.get<Repository<TranslationKey>>(getRepositoryToken(TranslationKey));
    valueRepository = moduleRef.get<Repository<TranslationValue>>(getRepositoryToken(TranslationValue));

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await languageRepository.clear();
    await groupRepository.clear();
    await invitationRepository.clear();
    await keyRepository.clear();
    await valueRepository.clear();
  });

  beforeEach(async () => {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await languageRepository.clear();
    await groupRepository.clear();
    await invitationRepository.clear();
    await keyRepository.clear();
    await valueRepository.clear();

    //Setup users
    admin.email = "admin@email.com";
    tester.email = "tester@email.com";
    await userRepository.save(admin);
    await userRepository.save(tester);

    //Setup project
    project.name = "project_name";
    project.color = "FFFFFF";
    await projectRepository.save(project);

    const relation = new UserProject();
    relation.project = project;
    relation.user = admin;
    relation.role = Role.Owner;
    await userProjectRepository.save(relation);

    const relation2 = new UserProject();
    relation2.project = project;
    relation2.user = tester;
    relation2.role = Role.Editor;
    await userProjectRepository.save(relation2);

    defaultGroup.name = DefaultGroupName;
    defaultGroup.project = project;
    defaultGroup = await GroupHelper.dbAddGroup(groupRepository, defaultGroup);
  });

  describe("Test group", () => {
    beforeEach(async () => {
      await groupRepository.clear();
      defaultGroup.name = DefaultGroupName;
      defaultGroup.project = project;
      defaultGroup = await GroupHelper.dbAddGroup(groupRepository, defaultGroup);
    });

    it("Creation", async () => {
      const dto = new CreateGroupDto({
        name: "My group"
      });
      await EdgeHelper.validRequest(GroupHelper.createGroup(app, tester.id, project.id, dto));
    });

    it("Update", async () => {
      let group = new Group();
      group.name = "My group";
      group.project = project;
      group = await GroupHelper.dbAddGroup(groupRepository, group);

      const dto = new UpdateGroupDto({
        name: "New name"
      });
      await EdgeHelper.validRequest(GroupHelper.updateGroup(app, tester.id, project.id, group.id, dto));
    });
  });

  describe("Test invitation", () => {
    const random = new User("random_id", "random");

    beforeEach(async () => {
      await invitationRepository.clear();
      random.email = "random@email.com";
      await userRepository.save(random);
    });

    it("Creation", async () => {
      const dto = new CreateInvitationDto({
        email: "random@email.com",
        project_id: project.id,
        role: Role.Manager
      });
      await EdgeHelper.invalidRequest(InvitationHelper.createInvitation(app, tester.id, dto));
    });

    it("Delete", async () => {
      let invitation = new Invitation();
      invitation = await InvitationHelper.dbAddInvitation(invitationRepository, project, random, tester, Role.Manager);

      await EdgeHelper.invalidRequest(InvitationHelper.deleteInvitation(app, tester.id, project.id, invitation.id));
    });
  });

  describe("Test key", () => {
    beforeEach(async () => {
      await keyRepository.clear();
    });

    it("Creation", async () => {
      const dto = new CreateKeyDto({
        name: "My key",
        group_id: defaultGroup.id,
        is_plural: false
      });
      await EdgeHelper.validRequest(KeyHelper.createKey(app, tester.id, project.id, dto));
    });

    it("Update", async () => {
      let key = new TranslationKey();
      key.group = defaultGroup;
      key.is_plural = false;
      key.name = "My key";
      key.project = project;
      key = await KeyHelper.dbAddKey(keyRepository, key);

      const dto = new UpdateKeyDto({
        name: "Update",
        is_plural: true,
        group_id: defaultGroup.id
      });
      await EdgeHelper.validRequest(KeyHelper.updateKey(app, tester.id, project.id, key.id, dto));
    });

    it("Delete", async () => {
      let key = new TranslationKey();
      key.group = defaultGroup;
      key.is_plural = false;
      key.name = "My key";
      key.project = project;
      key = await KeyHelper.dbAddKey(keyRepository, key);

      await EdgeHelper.validRequest(KeyHelper.deleteKey(app, tester.id, project.id, key.id));
    });
  });

  describe("Test language", () => {
    beforeEach(async () => {
      await languageRepository.clear();
    });

    it("Creation", async () => {
      const dto = new CreateLanguageDto({
        name: "My language"
      });
      await EdgeHelper.validRequest(LanguageHelper.createLanguage(app, tester.id, project.id, dto));
    });

    it("Update", async () => {
      let language = new Language();
      language.name = "My language";
      language.project = project;
      language = await LanguageHelper.dbAddLanguage(languageRepository, language);

      const dto = new CreateLanguageDto({
        name: "Updated name"
      });
      await EdgeHelper.validRequest(LanguageHelper.updateLanguage(app, tester.id, project.id, language.id, dto));
    });

    it("Delete", async () => {
      let language = new Language();
      language.name = "My language";
      language.project = project;
      language = await LanguageHelper.dbAddLanguage(languageRepository, language);

      await EdgeHelper.validRequest(LanguageHelper.deleteLanguage(app, tester.id, project.id, language.id));
    });
  });

  describe("Test project", () => {
    it("Update", async () => {
      const dto = new UpdateProjectDto({
        name: "UpdateName",
        color: "000000"
      });
      await EdgeHelper.invalidRequest(ProjectsTestHelpers.updateProject(app, tester.id, project.id, dto));
    });

    it("Delete", async () => {
      await EdgeHelper.invalidRequest(ProjectsTestHelpers.deleteProject(app, tester.id, project.id));
    });
  });

  describe("Test value", () => {
    let key = new TranslationKey();
    key.group = defaultGroup;
    key.is_plural = false;
    key.name = "key";
    key.project = project;

    let language = new Language();
    language.name = "language";
    language.project = project;

    beforeEach(async () => {
      await valueRepository.clear();
      await keyRepository.clear();
      await languageRepository.clear();
      key = await KeyHelper.dbAddKey(keyRepository, key);
      language = await LanguageHelper.dbAddLanguage(languageRepository, language);
    });

    it("Creation", async () => {
      const dto = new CreateValueDto({
        name: "value",
        language_id: language.id,
        quantity_string: null
      });
      await EdgeHelper.validRequest(ValueHelper.createValue(app, tester.id, project.id, key.id, dto));
    });

    it("Update", async () => {
      let value = new TranslationValue();
      value.key = key;
      value.language = language;
      value.name = "value";
      value.quantity_string = null;
      value = await ValueHelper.dbAddValue(valueRepository, value);

      const dto = new UpdateValueDto({
        name: "update"
      });
      await EdgeHelper.validRequest(ValueHelper.updateValue(app, tester.id, project.id, key.id, value.id, dto));
    });

    it("Delete", async () => {
      let value = new TranslationValue();
      value.key = key;
      value.language = language;
      value.name = "value";
      value.quantity_string = null;
      value = await ValueHelper.dbAddValue(valueRepository, value);

      await EdgeHelper.validRequest(ValueHelper.deleteValue(app, tester.id, project.id, key.id, value.id));
    });
  });

  describe("Test user", () => {
    const random = new User("random_id", "random");

    beforeEach(async () => {
      random.email = "random@email.com";
      await userRepository.save(random);
      const relation = new UserProject();
      relation.project = project;
      relation.user = random;
      relation.role = Role.Manager;
      await userProjectRepository.save(relation);
    });

    it("Update", async () => {
      const dto = new UpdateRoleDto({
        role: Role.Translator
      });
      await EdgeHelper.invalidRequest(ProjectsTestHelpers.updateUserRole(app, tester.id, project.id, random.id, dto));
    });

    it("Delete", async () => {
      await EdgeHelper.invalidRequest(ProjectsTestHelpers.removeUserFromProject(app, tester.id, project.id, random.id));
    });
  });
});