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
import Group from "../../src/groups/group.entity";
import TestsHelpers from "../helpers/tests.helpers";
import Language from "../../src/languages/language.entity";
import TranslationKey from "../../src/translation/translation_key.entity";
import TranslationValue from "../../src/translation/translation_value.entity";
import Role from "../../src/roles/role.enum";
import * as request from "supertest";
import CreateInvitationDto from "../../src/invitations/dto/create-invitation.dto";
import Invitation from "../../src/invitations/invitation.entity";
import CreateLanguageDto from "../../src/projects/dto/create-language.dto";

describe("Roles E2E", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let groupRepository: Repository<Group>;
  let languageRepository: Repository<Language>;
  let invitationRepository: Repository<Invitation>;
  let translationKeysRepository: Repository<TranslationKey>;
  let translationValueRepository: Repository<TranslationValue>;

  let project: Project;
  let owner: User;
  let manager: User;
  let editor: User;
  let translator: User;

  const OwnerID: string = "owner-id";
  const ManagerID: string = "manager-id";
  const EditorID: string = "editor-id";
  const TranslatorID: string = "translator-id";

  async function insertProject(): Promise<Project> {
    const project = new Project();
    project.name = "Project #1";
    project.description = "Main project when testing roles";
    project.color = "123456";
    return await projectRepository.save(project);
  }

  async function insertUser(userId: string, username: string, email: string): Promise<User> {
    const user = new User(userId, username);
    user.email = email;
    return await userRepository.save(user);
  }

  async function insertRelation(user: User, project: Project, role: Role): Promise<UserProject> {
    const relation = new UserProject();
    relation.user = user;
    relation.project = project;
    relation.role = role;
    return await userProjectRepository.save(relation);
  }

  async function insertGroup(name: string): Promise<Group> {
    const group = new Group();
    group.name = name;
    group.project = project;
    return await groupRepository.save(group);
  }

  async function insertLanguage(name: string): Promise<Language> {
    const language = new Language();
    language.name = name;
    language.project = project;
    return await languageRepository.save(language);
  }

  async function insertTranslationKey(name: string, group: Group): Promise<TranslationKey> {
    const key = new TranslationKey();
    key.project = project;
    key.group = group;
    key.name = name;
    key.isPlural = false;
    return await translationKeysRepository.save(key);
  }

  async function insertTranslationValue(name: string, key: TranslationKey, language: Language): Promise<TranslationValue> {
    const value = new TranslationValue();
    value.key = key;
    value.language = language;
    value.quantityString = null;
    value.name = name;
    return await translationValueRepository.save(value);
  }

  async function populateDatabase(): Promise<void> {
    // Create project
    project = await insertProject();

    // Create Owner
    owner = await insertUser(OwnerID, "owner", "owner@lokapp.io");
    await insertRelation(owner, project, Role.Owner);

    // Create Manager
    manager = await insertUser(ManagerID, "manager", "manager@lokapp.io");
    await insertRelation(manager, project, Role.Manager);

    // Create Editor
    editor = await insertUser(EditorID, "editor", "editor@lokapp.io");
    await insertRelation(editor, project, Role.Editor);

    // Create Translator
    translator = await insertUser(TranslatorID, "translator", "translator@lokapp.io");
    await insertRelation(translator, project, Role.Translator);
  }

  async function clearDatabase(): Promise<void> {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await groupRepository.clear();
    await languageRepository.clear();
    await invitationRepository.clear();
    await translationKeysRepository.clear();
    await translationValueRepository.clear();
  }

  beforeAll(async () => {
    const moduleRef = await TestsHelpers.getTestingModule()
      .overrideGuard(JwtAuthUserGuard)
      .useValue(mockedAuthGuard)
      .compile();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    projectRepository = moduleRef.get<Repository<Project>>(getRepositoryToken(Project));
    userProjectRepository = moduleRef.get<Repository<UserProject>>(getRepositoryToken(UserProject));
    groupRepository = moduleRef.get<Repository<Group>>(getRepositoryToken(Group));
    languageRepository = moduleRef.get<Repository<Language>>(getRepositoryToken(Language));
    invitationRepository = moduleRef.get<Repository<Invitation>>(getRepositoryToken(Invitation));
    translationKeysRepository = moduleRef.get<Repository<TranslationKey>>(getRepositoryToken(TranslationKey));
    translationValueRepository = moduleRef.get<Repository<TranslationValue>>(getRepositoryToken(TranslationValue));

    // Before all tests, create the project and the different types of users
    await populateDatabase();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await clearDatabase();
    await app.close();
  });

  describe("Owner", () => {
    afterEach(async () => {
      await clearDatabase();
      await populateDatabase();
    });

    describe("Projects", () => {
      it("Owner can edit project", async () => {
        const editedResp = await request(app.getHttpServer())
          .put(`/projects/${project.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID)
          .send({
            name: "Edited name",
            color: "123456",
            description: "Edited description"
          });
        expect(editedResp.status).toEqual(200);
      });

      it("Owner can delete project", async () => {
        const deleteResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID);
        expect(deleteResp.status).toEqual(204);
      });
    });

    describe("Users of the project", () => {
      it("Owner can see the list of users within the project", async () => {
        const usersResp = await request(app.getHttpServer())
          .get(`/projects/${project.id}/users`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID);
        expect(usersResp.status).toEqual(200);
        expect(usersResp.body.length).toEqual(4);
      });

      it("Owner can edit another user's role", async () => {
        const changeRoleResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/users/${EditorID}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID)
          .send({role: Role.Translator});
        expect(changeRoleResp.status).toEqual(200);
      });

      it("Owner can delete users", async () => {
        const deleteResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/users/${EditorID}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID);
        expect(deleteResp.status).toEqual(204);
      });
    });

    describe("Invitations", () => {
      beforeAll(async () => {
        const guest = new User("guest-id", "guest username");
        guest.email = "guest@lokapp.io";
        await userRepository.save(guest);
      });

      afterEach(async () => {
        await invitationRepository.clear();
      });

      it("Owner can create and delete an invitation", async () => {
        const invitationResp = await request(app.getHttpServer())
          .post("/invitations")
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID)
          .send(new CreateInvitationDto({
            email: "guest@lokapp.io",
            projectId: project.id,
            role: Role.Manager
          }));
        expect(invitationResp.status).toEqual(201);

        const deleteInvitation = await request(app.getHttpServer())
          .delete(`/invitations/${invitationResp.body.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID);
        expect(deleteInvitation.status).toEqual(204);
      });
    });

    describe("Groups", () => {
      beforeEach(async () => {
        await insertGroup("Name of the group");
      });

      it("Owner can create groups", async () => {
        const groupResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/groups`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID)
          .send({name: "Group #1"});
        expect(groupResp.status).toEqual(201);
      });

      it("Owner can see groups", async () => {
        const groupsResp = await request(app.getHttpServer())
          .get(`/projects/${project.id}/groups`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID);
        expect(groupsResp.status).toEqual(200);
        expect(groupsResp.body.length).toBeGreaterThan(0);
      });

      it("Owner can edit groups", async () => {
        const groupEntity = await insertGroup("Editable group");
        const editingResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/groups/${groupEntity.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID)
          .send({name: "Edited group name"});
        expect(editingResp.status).toEqual(200);
        expect(editingResp.body.name).toEqual("Edited group name");
      });
    });

    describe("Languages", () => {
      it("Owner can create new language", async () => {
        const createLanguageResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/languages`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID)
          .send(new CreateLanguageDto({name: "English"}));
        expect(createLanguageResp.status).toEqual(201);
      });

      it("Owner can update a language", async () => {
        const language = new Language();
        language.project = project;
        language.name = "To edit";
        const languageEntity = await languageRepository.save(language);

        const editingResp = await request(app.getHttpServer())
          .put(`/projects/${project.id}/languages/${languageEntity.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID)
          .send({name: "Edited name"});
        expect(editingResp.status).toEqual(200);
      });

      it("Owner can delete a language", async () => {
        const language = new Language();
        language.project = project;
        language.name = "To delete";
        const languageEntity = await languageRepository.save(language);

        const deleteResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/languages/${languageEntity.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID);
        expect(deleteResp.status).toEqual(204);
      });
    });

    describe("Translation keys", () => {
      it("Owner can create a translation key", async () => {
        const groupEntity = await insertGroup("Name of the group");
        const translationKeyResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/translations`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID)
          .send({
            name: "Translation key",
            groupId: groupEntity.id,
            isPlural: false
          });
        expect(translationKeyResp.status).toEqual(201);
      });

      it("Owner can edit a translation key", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key_1", group);
        const translationKeyResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/translations/${key.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID)
          .send({name: "new_key"});
        expect(translationKeyResp.status).toEqual(200);
      });

      it("Owner can delete a translation key", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key_1", group);
        const translationKeyResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/translations/${key.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID);
        expect(translationKeyResp.status).toEqual(204);
      });
    });

    describe("Translation values", () => {
      it("Owner can create a translation value", async () => {
        const group = await insertGroup("Name of the group");
        const language = await insertLanguage("English");
        const key = await insertTranslationKey("translation_key", group);

        const translationValueResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/translations/${key.id}/values`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID)
          .send({
            name: "Translated value",
            languageId: language.id,
            quantityString: null
          });
        expect(translationValueResp.status).toEqual(201);
      });

      it("Owner can edit a translation value", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key", group);
        const language = await insertLanguage("English");
        const value = await insertTranslationValue("Translated value", key, language);
        const translationValueResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/translations/${key.id}/values/${value.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID)
          .send({name: "Edited translation"});
        expect(translationValueResp.status).toEqual(200);
      });

      it("Owner can delete a translation value", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key", group);
        const language = await insertLanguage("English");
        const value = await insertTranslationValue("Translated value", key, language);
        const translationValueResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/translations/${key.id}/values/${value.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID);
        expect(translationValueResp.status).toEqual(204);
      });
    });
  });

  describe("Manager", () => {
    afterEach(async () => {
      await clearDatabase();
      await populateDatabase();
    });

    describe("Projects", () => {
      it("Manager can edit project", async () => {
        const editedResp = await request(app.getHttpServer())
          .put(`/projects/${project.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID)
          .send({
            name: "Edited name",
            color: "123456",
            description: "Edited description"
          });
        expect(editedResp.status).toEqual(200);
      });

      it("Manager CAN'T can delete project", async () => {
        const deleteResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID);
        expect(deleteResp.status).toEqual(403);
      });
    });

    describe("Users of the project", () => {
      it("Manager can see the list of users within the project", async () => {
        const usersResp = await request(app.getHttpServer())
          .get(`/projects/${project.id}/users`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID);
        expect(usersResp.status).toEqual(200);
        expect(usersResp.body.length).toEqual(4);
      });

      it("Manager can edit another user's role", async () => {
        const changeRoleResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/users/${EditorID}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID)
          .send({role: Role.Translator});
        expect(changeRoleResp.status).toEqual(200);
      });

      it("Manager can delete users", async () => {
        const deleteResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/users/${EditorID}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID);
        expect(deleteResp.status).toEqual(204);
      });

    });

    describe("Invitations", () => {
      beforeAll(async () => {
        const guest = new User("guest-id", "guest username");
        guest.email = "guest@lokapp.io";
        await userRepository.save(guest);
      });

      afterEach(async () => {
        await invitationRepository.clear();
      });

      it("Manager can create and delete an invitation", async () => {
        const invitationResp = await request(app.getHttpServer())
          .post("/invitations")
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID)
          .send(new CreateInvitationDto({
            email: "guest@lokapp.io",
            projectId: project.id,
            role: Role.Manager
          }));
        expect(invitationResp.status).toEqual(201);

        const deleteInvitation = await request(app.getHttpServer())
          .delete(`/invitations/${invitationResp.body.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID);
        expect(deleteInvitation.status).toEqual(204);
      });
    });

    describe("Groups", () => {
      beforeEach(async () => {
        const group = new Group();
        group.name = "Name of the group";
        group.project = project;
        await groupRepository.save(group);
      });

      it("Manager can create groups", async () => {
        const groupResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/groups`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID)
          .send({name: "Group #1"});
        expect(groupResp.status).toEqual(201);
      });

      it("Manager can see groups", async () => {
        const groupsResp = await request(app.getHttpServer())
          .get(`/projects/${project.id}/groups`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID);
        expect(groupsResp.status).toEqual(200);
        expect(groupsResp.body.length).toBeGreaterThan(0);
      });

      it("Manager can edit groups", async () => {
        const group = new Group();
        group.name = "Editable group";
        group.project = project;
        const groupEntity = await groupRepository.save(group);

        const editingResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/groups/${groupEntity.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID)
          .send({name: "Edited group name"});
        expect(editingResp.status).toEqual(200);
        expect(editingResp.body.name).toEqual("Edited group name");
      });
    });

    describe("Languages", () => {
      it("Manager can create new language", async () => {
        const createLanguageResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/languages`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID)
          .send(new CreateLanguageDto({name: "English"}));
        expect(createLanguageResp.status).toEqual(201);
      });

      it("Manager can update a language", async () => {
        const language = new Language();
        language.project = project;
        language.name = "To edit";
        const languageEntity = await languageRepository.save(language);

        const editingResp = await request(app.getHttpServer())
          .put(`/projects/${project.id}/languages/${languageEntity.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID)
          .send({name: "Edited name"});
        expect(editingResp.status).toEqual(200);
      });

      it("Manager can delete a language", async () => {
        const language = new Language();
        language.project = project;
        language.name = "To delete";
        const languageEntity = await languageRepository.save(language);

        const deleteResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/languages/${languageEntity.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID);
        expect(deleteResp.status).toEqual(204);
      });
    });

    describe("Translation keys", () => {
      it("Manager can create a translation key", async () => {
        const groupEntity = await insertGroup("Name of the group");
        const translationKeyResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/translations`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID)
          .send({
            name: "Translation key",
            groupId: groupEntity.id,
            isPlural: false
          });
        expect(translationKeyResp.status).toEqual(201);
      });

      it("Manager can edit a translation key", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key_1", group);
        const translationKeyResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/translations/${key.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID)
          .send({name: "new_key"});
        expect(translationKeyResp.status).toEqual(200);
      });

      it("Manager can delete a translation key", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key_1", group);
        const translationKeyResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/translations/${key.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID);
        expect(translationKeyResp.status).toEqual(204);
      });
    });

    describe("Translation values", () => {
      it("Manager can create a translation value", async () => {
        const group = await insertGroup("Name of the group");
        const language = await insertLanguage("English");
        const key = await insertTranslationKey("translation_key", group);

        const translationValueResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/translations/${key.id}/values`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID)
          .send({
            name: "Translated value",
            languageId: language.id,
            quantityString: null
          });
        expect(translationValueResp.status).toEqual(201);
      });

      it("Manager can edit a translation value", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key", group);
        const language = await insertLanguage("English");
        const value = await insertTranslationValue("Translated value", key, language);
        const translationValueResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/translations/${key.id}/values/${value.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID)
          .send({name: "Edited translation"});
        expect(translationValueResp.status).toEqual(200);
      });

      it("Manager can delete a translation value", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key", group);
        const language = await insertLanguage("English");
        const value = await insertTranslationValue("Translated value", key, language);
        const translationValueResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/translations/${key.id}/values/${value.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", ManagerID);
        expect(translationValueResp.status).toEqual(204);
      });
    });
  });

  describe("Editor", () => {
    afterEach(async () => {
      await clearDatabase();
      await populateDatabase();
    });

    describe("Projects", () => {
      it("Editor CAN'T can edit project", async () => {
        const editedResp = await request(app.getHttpServer())
          .put(`/projects/${project.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID)
          .send({
            name: "Edited name",
            color: "123456",
            description: "Edited description"
          });
        expect(editedResp.status).toEqual(403);
      });

      it("Editor CAN'T can delete project", async () => {
        const deleteResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID);
        expect(deleteResp.status).toEqual(403);
      });
    });

    describe("Users of the project", () => {
      it("Editor can see the list of users within the project", async () => {
        const usersResp = await request(app.getHttpServer())
          .get(`/projects/${project.id}/users`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID);
        expect(usersResp.status).toEqual(200);
        expect(usersResp.body.length).toEqual(4);
      });

      it("Editor CAN'T edit another user's role", async () => {
        const changeRoleResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/users/${TranslatorID}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID)
          .send({role: Role.Translator});
        expect(changeRoleResp.status).toEqual(403);
      });

      it("Editor CAN'T delete users", async () => {
        const deleteResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/users/${TranslatorID}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID);
        expect(deleteResp.status).toEqual(403);
      });
    });

    describe("Invitations", () => {
      beforeEach(async () => {
        // Add a user to invite
        const guest = new User("guest-id", "guest username");
        guest.email = "guest@lokapp.io";
        await userRepository.save(guest);
      });

      afterEach(async () => {
        await invitationRepository.clear();
      });

      it("Editor CAN'T create an invitation", async () => {
        const invitationResp = await request(app.getHttpServer())
          .post("/invitations")
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID)
          .send(new CreateInvitationDto({
            email: "guest@lokapp.io",
            projectId: project.id,
            role: Role.Manager
          }));
        expect(invitationResp.status).toEqual(403);
      });

      it("Editor CAN'T delete an invitation", async () => {
        // Create an invitation as the owner
        const invitationResp = await request(app.getHttpServer())
          .post("/invitations")
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID)
          .send(new CreateInvitationDto({
            email: "guest@lokapp.io",
            projectId: project.id,
            role: Role.Manager
          }));
        expect(invitationResp.status).toEqual(201);

        // Try to delete the invitation as the Editor
        const deleteInvitation = await request(app.getHttpServer())
          .delete(`/invitations/${invitationResp.body.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID);
        expect(deleteInvitation.status).toEqual(403);
      });
    });

    describe("Groups", () => {
      beforeEach(async () => {
        const group = new Group();
        group.name = "Name of the group";
        group.project = project;
        await groupRepository.save(group);
      });

      it("Editor can create groups", async () => {
        const groupResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/groups`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID)
          .send({name: "Group #1"});
        expect(groupResp.status).toEqual(201);
      });

      it("Editor can see groups", async () => {
        const groupsResp = await request(app.getHttpServer())
          .get(`/projects/${project.id}/groups`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID);
        expect(groupsResp.status).toEqual(200);
        expect(groupsResp.body.length).toBeGreaterThan(0);
      });

      it("Editor can edit groups", async () => {
        const group = new Group();
        group.name = "Editable group";
        group.project = project;
        const groupEntity = await groupRepository.save(group);

        const editingResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/groups/${groupEntity.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID)
          .send({name: "Edited group name"});
        expect(editingResp.status).toEqual(200);
        expect(editingResp.body.name).toEqual("Edited group name");
      });
    });

    describe("Languages", () => {
      it("Editor can create new language", async () => {
        const createLanguageResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/languages`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID)
          .send(new CreateLanguageDto({name: "English"}));
        expect(createLanguageResp.status).toEqual(201);
      });

      it("Editor can update a language", async () => {
        const language = new Language();
        language.project = project;
        language.name = "To edit";
        const languageEntity = await languageRepository.save(language);

        const editingResp = await request(app.getHttpServer())
          .put(`/projects/${project.id}/languages/${languageEntity.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID)
          .send({name: "Edited name"});
        expect(editingResp.status).toEqual(200);
      });

      it("Editor can delete a language", async () => {
        const language = new Language();
        language.project = project;
        language.name = "To delete";
        const languageEntity = await languageRepository.save(language);

        const deleteResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/languages/${languageEntity.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID);
        expect(deleteResp.status).toEqual(204);
      });
    });

    describe("Translation keys", () => {
      it("Editor can create a translation key", async () => {
        const groupEntity = await insertGroup("Name of the group");
        const translationKeyResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/translations`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID)
          .send({
            name: "Translation key",
            groupId: groupEntity.id,
            isPlural: false
          });
        expect(translationKeyResp.status).toEqual(201);
      });

      it("Editor can edit a translation key", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key_1", group);
        const translationKeyResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/translations/${key.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID)
          .send({name: "new_key"});
        expect(translationKeyResp.status).toEqual(200);
      });

      it("Editor can delete a translation key", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key_1", group);
        const translationKeyResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/translations/${key.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID);
        expect(translationKeyResp.status).toEqual(204);
      });
    });

    describe("Translation values", () => {
      it("Editor can create a translation value", async () => {
        const group = await insertGroup("Name of the group");
        const language = await insertLanguage("English");
        const key = await insertTranslationKey("translation_key", group);

        const translationValueResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/translations/${key.id}/values`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID)
          .send({
            name: "Translated value",
            languageId: language.id,
            quantityString: null
          });
        expect(translationValueResp.status).toEqual(201);
      });

      it("Editor can edit a translation value", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key", group);
        const language = await insertLanguage("English");
        const value = await insertTranslationValue("Translated value", key, language);
        const translationValueResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/translations/${key.id}/values/${value.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID)
          .send({name: "Edited translation"});
        expect(translationValueResp.status).toEqual(200);
      });

      it("Editor can delete a translation value", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key", group);
        const language = await insertLanguage("English");
        const value = await insertTranslationValue("Translated value", key, language);
        const translationValueResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/translations/${key.id}/values/${value.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", EditorID);
        expect(translationValueResp.status).toEqual(204);
      });
    });
  });

  describe("Translator", () => {
    afterEach(async () => {
      await clearDatabase();
      await populateDatabase();
    });

    describe("Projects", () => {
      it("Translator CAN'T can edit project", async () => {
        const editedResp = await request(app.getHttpServer())
          .put(`/projects/${project.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID)
          .send({
            name: "Edited name",
            color: "123456",
            description: "Edited description"
          });
        expect(editedResp.status).toEqual(403);
      });

      it("Translator CAN'T can delete project", async () => {
        const deleteResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID);
        expect(deleteResp.status).toEqual(403);
      });
    });

    describe("Users of the project", () => {
      it("Translator can see the list of users within the project", async () => {
        const usersResp = await request(app.getHttpServer())
          .get(`/projects/${project.id}/users`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID);
        expect(usersResp.status).toEqual(200);
        expect(usersResp.body.length).toEqual(4);
      });

      it("Translator CAN'T edit another user's role", async () => {
        const changeRoleResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/users/${EditorID}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID)
          .send({role: Role.Translator});
        expect(changeRoleResp.status).toEqual(403);
      });

      it("Translator CAN'T delete users", async () => {
        const deleteResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/users/${EditorID}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID);
        expect(deleteResp.status).toEqual(403);
      });
    });

    describe("Invitations", () => {
      beforeEach(async () => {
        // Insert user to invite in DB
        const guest = new User("guest-id", "guest username");
        guest.email = "guest@lokapp.io";
        await userRepository.save(guest);
      });

      afterEach(async () => {
        await invitationRepository.clear();
      });

      it("Translator CAN'T create an invitation", async () => {
        const invitationResp = await request(app.getHttpServer())
          .post("/invitations")
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID)
          .send(new CreateInvitationDto({
            email: "guest@lokapp.io",
            projectId: project.id,
            role: Role.Manager
          }));
        expect(invitationResp.status).toEqual(403);
      });

      it("Translator CAN'T delete an invitation", async () => {
        // Create an invitation as the owner
        const invitationResp = await request(app.getHttpServer())
          .post("/invitations")
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", OwnerID)
          .send(new CreateInvitationDto({
            email: "guest@lokapp.io",
            projectId: project.id,
            role: Role.Manager
          }));
        expect(invitationResp.status).toEqual(201);

        // Try to delete the invitation as the Editor
        const deleteInvitation = await request(app.getHttpServer())
          .delete(`/invitations/${invitationResp.body.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID);
        expect(deleteInvitation.status).toEqual(403);
      });
    });

    describe("Groups", () => {
      beforeEach(async () => {
        const group = new Group();
        group.name = "Name of the group";
        group.project = project;
        await groupRepository.save(group);
      });

      it("Translator CAN't create groups", async () => {
        const groupResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/groups`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID)
          .send({name: "Group #1"});
        expect(groupResp.status).toEqual(403);
      });

      it("Translator can see groups", async () => {
        const groupsResp = await request(app.getHttpServer())
          .get(`/projects/${project.id}/groups`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID);
        expect(groupsResp.status).toEqual(200);
        expect(groupsResp.body.length).toBeGreaterThan(0);
      });

      it("Translator CAN'T edit groups", async () => {
        const group = new Group();
        group.name = "Editable group";
        group.project = project;
        const groupEntity = await groupRepository.save(group);

        const editingResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/groups/${groupEntity.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID)
          .send({name: "Edited group name"});
        expect(editingResp.status).toEqual(403);
      });
    });

    describe("Languages", () => {
      it("Translator CAN'T create new language", async () => {
        const createLanguageResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/languages`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID)
          .send(new CreateLanguageDto({name: "English"}));
        expect(createLanguageResp.status).toEqual(403);
      });

      it("Translator CAN'T update a language", async () => {
        const language = new Language();
        language.project = project;
        language.name = "To edit";
        const languageEntity = await languageRepository.save(language);

        const editingResp = await request(app.getHttpServer())
          .put(`/projects/${project.id}/languages/${languageEntity.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID)
          .send({name: "Edited name"});
        expect(editingResp.status).toEqual(403);
      });

      it("Translator CAN'T delete a language", async () => {
        const language = new Language();
        language.project = project;
        language.name = "To delete";
        const languageEntity = await languageRepository.save(language);

        const deleteResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/languages/${languageEntity.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID);
        expect(deleteResp.status).toEqual(403);
      });
    });

    describe("Translation keys", () => {
      it("Translator CAN'T create a translation key", async () => {
        const groupEntity = await insertGroup("Name of the group");
        const translationKeyResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/translations`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID)
          .send({
            name: "Translation key",
            groupId: groupEntity.id,
            isPlural: false
          });
        expect(translationKeyResp.status).toEqual(403);
      });

      it("Translator CAN'T edit a translation key", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key_1", group);
        const translationKeyResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/translations/${key.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID)
          .send({name: "new_key"});
        expect(translationKeyResp.status).toEqual(403);
      });

      it("Translator CAN'T delete a translation key", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key_1", group);
        const translationKeyResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/translations/${key.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID);
        expect(translationKeyResp.status).toEqual(403);
      });
    });

    describe("Translation values", () => {
      it("Translator can create a translation value", async () => {
        const group = await insertGroup("Name of the group");
        const language = await insertLanguage("English");
        const key = await insertTranslationKey("translation_key", group);

        const translationValueResp = await request(app.getHttpServer())
          .post(`/projects/${project.id}/translations/${key.id}/values`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID)
          .send({
            name: "Translated value",
            languageId: language.id,
            quantityString: null
          });
        expect(translationValueResp.status).toEqual(201);
      });

      it("Translator can edit a translation value", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key", group);
        const language = await insertLanguage("English");
        const value = await insertTranslationValue("Translated value", key, language);
        const translationValueResp = await request(app.getHttpServer())
          .patch(`/projects/${project.id}/translations/${key.id}/values/${value.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID)
          .send({name: "Edited translation"});
        expect(translationValueResp.status).toEqual(200);
      });

      it("Translator can delete a translation value", async () => {
        const group = await insertGroup("Name of the group");
        const key = await insertTranslationKey("translation_key", group);
        const language = await insertLanguage("English");
        const value = await insertTranslationValue("Translated value", key, language);
        const translationValueResp = await request(app.getHttpServer())
          .delete(`/projects/${project.id}/translations/${key.id}/values/${value.id}`)
          .auth("mocked.jwt", {type: "bearer"})
          .set("mocked_user_id", TranslatorID);
        expect(translationValueResp.status).toEqual(204);
      });
    });
  });
});