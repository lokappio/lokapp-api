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
import TranslationKey from "../../src/translation/translation_key.entity";
import CreateKeyDto from "../../src/translation/dto/create-key.dto";
import Group from "../../src/groups/group.entity";
import Language from "../../src/languages/language.entity";
import TestsHelpers from "../helpers/tests.helpers";
import * as request from "supertest";
import Role from "../../src/roles/role.enum";

describe("Translations keys E2E", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let groupRepository: Repository<Group>;
  let translationKeysRepository: Repository<TranslationKey>;

  let populatedProjects: Project[];

  async function clearDatabase(): Promise<void> {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await groupRepository.clear();
    await translationKeysRepository.clear();
  }

  async function findTranslationKeys(projectId: number): Promise<Language[]> {
    return await translationKeysRepository.find({
      where: {
        project: {
          id: projectId
        }
      }
    });
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
    translationKeysRepository = moduleRef.get<Repository<TranslationKey>>(getRepositoryToken(TranslationKey));

    // Populate users and projects in database
    const populatedUsers = await TestsHelpers.populateUsers(userRepository);
    populatedProjects = await TestsHelpers.populateProjects(projectRepository);
    await TestsHelpers.populateDefaultRelations(populatedUsers, populatedProjects, userProjectRepository);

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await clearDatabase();
    await app.close();
  });

  describe("Creating translation keys", () => {
    afterEach(async () => {
      await translationKeysRepository.clear();
      await groupRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/123456/translations`);
      expect(response.status).toEqual(401);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(response.status).toEqual(403);
    });

    it("Creating translation key with DTO error", async () => {
      // No data
      const noDataResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({});
      expect(noDataResp.status).toEqual(400);

      // Missing group
      const missingGroupResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Name of the translation key", isPlural: false});
      expect(missingGroupResp.status).toEqual(400);

      // Missing name
      const missingNameResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({groupId: 1, isPlural: false});
      expect(missingNameResp.status).toEqual(400);

      // Missing plural key
      const missingPluralResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Name of the translation key", groupId: 1});
      expect(missingPluralResp.status).toEqual(400);
    });

    it("Group doesn't exist", async () => {
      const keyDto = new CreateKeyDto({
        name: "The translation key",
        groupId: 123,
        isPlural: false
      });
      const response = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(keyDto);
      expect(response.status).toEqual(404);
    });

    it("Group isn't linked to the project", async () => {
      const createdGroup = await TestsHelpers.createGroup("Group of project #2", populatedProjects[1], groupRepository);

      const keyDto = new CreateKeyDto({
        name: "The translation key",
        groupId: createdGroup.id,
        isPlural: false
      });
      const response = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(keyDto);
      expect(response.status).toEqual(404);
    });

    it("Creating a new translation key", async () => {
      // Insert a group in database
      const createdGroup = await TestsHelpers.createGroup("Group #1", populatedProjects[0], groupRepository);

      // Get the current count of keys
      const keysCountBeforeCreation = (await findTranslationKeys(populatedProjects[0].id)).length;

      // Create a new singular key
      const keyDto = new CreateKeyDto({
        name: "New translation key",
        groupId: createdGroup.id,
        isPlural: false
      });
      const response = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(keyDto);
      expect(response.status).toEqual(201);

      const keysCountAfterCreation = (await findTranslationKeys(populatedProjects[0].id)).length;
      expect(keysCountAfterCreation).toEqual(keysCountBeforeCreation + 1);
    });

    it("Duplicated translation key", async () => {
      const firstGroup = await TestsHelpers.createGroup("first_group", populatedProjects[0], groupRepository);
      const secondGroup = await TestsHelpers.createGroup("second_group", populatedProjects[0], groupRepository);
      const translationKey: string = "translation_key_to_duplicate";

      const okResponse = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: translationKey,
          groupId: firstGroup.id,
          isPlural: false
        });
      expect(okResponse.status).toEqual(201);

      // Try to insert again the same translation key
      const duplicatedResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: translationKey,
          groupId: firstGroup.id,
          isPlural: false
        });
      expect(duplicatedResp.status).toEqual(422);

      // Try to insert the same translation key into another group
      const otherGroupResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: translationKey,
          groupId: secondGroup.id,
          isPlural: false
        });
      expect(otherGroupResp.status).toEqual(201);
    });
  });

  describe("Getting translation keys", () => {
    afterEach(async () => {
      await groupRepository.clear();
      await translationKeysRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/123456/translations`);
      expect(response.status).toEqual(401);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(response.status).toEqual(403);
    });

    it("Getting translation keys", async () => {
      const emptyResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(emptyResp.status).toEqual(200);
      expect(emptyResp.body.length).toEqual(0);

      const group = await TestsHelpers.createGroup("group_name", populatedProjects[0], groupRepository);
      await TestsHelpers.createTranslationKey("translation_key", group, populatedProjects[0], false, translationKeysRepository);

      const nonEmptyResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(nonEmptyResp.status).toEqual(200);
      expect(nonEmptyResp.body.length).toEqual(1);
    });

    it("Getting translation key details", async () => {
      const nonExistingKeyResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(nonExistingKeyResp.status).toEqual(404);

      const group = await TestsHelpers.createGroup("group_name", populatedProjects[0], groupRepository);
      const translationKey = await TestsHelpers.createTranslationKey("translation_key", group, populatedProjects[0], false, translationKeysRepository);

      const response = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations/${translationKey.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(200);
      expect(response.body.id).toEqual(translationKey.id);
    });
  });

  describe("Editing translation keys", () => {
    let translationKey: TranslationKey;

    beforeEach(async () => {
      const group = await TestsHelpers.createGroup("group_name", populatedProjects[0], groupRepository);
      translationKey = await TestsHelpers.createTranslationKey("translation_key", group, populatedProjects[0], false, translationKeysRepository);
    });

    afterEach(async () => {
      await translationKeysRepository.clear();
      await groupRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${translationKey.id}`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/projects/123456/translations/${translationKey.id}`);
      expect(response.status).toEqual(401);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${translationKey.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(response.status).toEqual(403);
    });

    it("Editing translation key with DTO error", async () => {
      // No data
      const noDataResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${translationKey.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({});
      expect(noDataResp.status).toEqual(400);
    });

    it("Group doesn't exist", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${translationKey.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({groupId: 123456});
      expect(response.status).toEqual(404);
    });

    it("Group not linked to the project", async () => {
      const group = await TestsHelpers.createGroup("Group of project #2", populatedProjects[1], groupRepository);
      const response = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${translationKey.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({groupId: group.id});
      expect(response.status).toEqual(404);
    });

    it("Editing a translation key", async () => {
      const editedResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${translationKey.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "edited translation key"});
      expect(editedResp.status).toEqual(200);

      const keyDetailsResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations/${translationKey.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(keyDetailsResp.status).toEqual(200);
      expect(keyDetailsResp.body.name).not.toEqual(translationKey.name);
      expect(keyDetailsResp.body.name).toEqual("edited translation key");
      expect(keyDetailsResp.body.id).toEqual(translationKey.id);
    });

    it("Editing a translation key resulting in a duplication", async () => {
      const group = await TestsHelpers.createGroup("Group of first project", populatedProjects[0], groupRepository);
      const firstKey = await TestsHelpers.createTranslationKey("translation_key_1", group, populatedProjects[0], false, translationKeysRepository);
      const keyToEdit = await TestsHelpers.createTranslationKey("translation_key_2", group, populatedProjects[0], false, translationKeysRepository);

      // Try to edit key and set the same name as the one added before
      const editedResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${keyToEdit}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: firstKey.name});
      expect(editedResp.status).toEqual(400);
    });
  });

  describe("Deleting translation key", () => {
    let translationKey: TranslationKey;

    beforeEach(async () => {
      const group = await TestsHelpers.createGroup("Name of the group", populatedProjects[0], groupRepository);
      translationKey = await TestsHelpers.createTranslationKey("key_1", group, populatedProjects[0], false, translationKeysRepository);
    });

    afterEach(async () => {
      await translationKeysRepository.clear();
      await groupRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/translations/${translationKey.id}`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/projects/123456/translations/${translationKey.id}`);
      expect(response.status).toEqual(401);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/translations/${translationKey.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(response.status).toEqual(403);
    });

    it("Deleting a translation key", async () => {
      const editedResp = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/translations/${translationKey.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(editedResp.status).toEqual(204);

      const keyDetailsResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations/${translationKey.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(keyDetailsResp.status).toEqual(404);
    });

    it("Deleting a project also deletes all translation keys", async () => {
      // Create project
      const project = new Project();
      project.name = "Project to delete";
      project.description = "This project is about to be deleted";
      project.color = "000000";
      const createdProject = await projectRepository.save(project);

      // Add relation
      const relation = new UserProject();
      relation.user = await userRepository.findOne(TestsHelpers.MOCKED_USER_ID_1);
      relation.project = createdProject;
      relation.role = Role.Owner;
      await userProjectRepository.save(relation);

      // Create group
      const group = await TestsHelpers.createGroup("Name of the group", createdProject, groupRepository);

      // Create keys
      const firstKey = await TestsHelpers.createTranslationKey("first key", group, createdProject, false, translationKeysRepository);
      const secondKey = await TestsHelpers.createTranslationKey("second key", group, createdProject, false, translationKeysRepository);

      // Check current count of keys
      const beforeDeletionCount = (await findTranslationKeys(createdProject.id)).length;
      expect(beforeDeletionCount).toEqual(2);

      // Delete project
      const deleteResp = await request(app.getHttpServer())
        .delete(`/projects/${createdProject.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(deleteResp.status).toEqual(204);

      // Check current count of keys after deleting the project
      const afterDeletionCount = (await findTranslationKeys(createdProject.id)).length;
      expect(afterDeletionCount).toEqual(0);

      // Try to find keys
      const searchKeys = await translationKeysRepository.findByIds([firstKey.id, secondKey.id]);
      expect(searchKeys.length).toEqual(0);
    });
  });
});