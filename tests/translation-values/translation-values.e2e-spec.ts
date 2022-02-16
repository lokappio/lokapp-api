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
import TranslationValue from "../../src/translation/translation_value.entity";
import Language from "../../src/languages/language.entity";
import QuantityString from "../../src/translation/quantity_string.enum";
import Group from "../../src/groups/group.entity";
import TestsHelpers from "../helpers/tests.helpers";
import * as request from "supertest";
import CreateValueDto from "../../src/translation/dto/create-value.dto";
import Role from "../../src/roles/role.enum";

describe("Translations values E2E", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let languageRepository: Repository<Language>;
  let groupRepository: Repository<Group>;
  let translationKeysRepository: Repository<TranslationKey>;
  let translationValuesRepository: Repository<TranslationValue>;

  let populatedUsers: User[];
  let populatedProjects: Project[];
  let populatedLanguages: Language[];
  let populatedGroups: Group[];
  let populatedTranslationKeys: TranslationKey[];

  async function clearDatabase(): Promise<void> {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await languageRepository.clear();
    await groupRepository.clear();
    await translationKeysRepository.clear();
    await translationValuesRepository.clear();
  }

  async function findTranslationValues(keyId: number): Promise<TranslationValue[]> {
    return await translationValuesRepository.find({
      where: {
        key: {
          id: keyId
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
    languageRepository = moduleRef.get<Repository<Language>>(getRepositoryToken(Language));
    groupRepository = moduleRef.get<Repository<Group>>(getRepositoryToken(Group));
    translationKeysRepository = moduleRef.get<Repository<TranslationKey>>(getRepositoryToken(TranslationKey));
    translationValuesRepository = moduleRef.get<Repository<TranslationValue>>(getRepositoryToken(TranslationValue));

    // Populate users and projects in database
    populatedUsers = await TestsHelpers.populateUsers(userRepository);
    populatedProjects = await TestsHelpers.populateProjects(projectRepository);
    await TestsHelpers.populateDefaultRelations(populatedUsers, populatedProjects, userProjectRepository);

    // Create some default translation keys
    populatedGroups = [
      await TestsHelpers.createGroup("default group", populatedProjects[0], groupRepository),
      await TestsHelpers.createGroup("default group", populatedProjects[1], groupRepository)
    ];

    populatedTranslationKeys = [
      await TestsHelpers.createTranslationKey("translation key 1", populatedGroups[0], populatedProjects[0], false, translationKeysRepository),
      await TestsHelpers.createTranslationKey("translation key 2", populatedGroups[0], populatedProjects[0], false, translationKeysRepository),
      await TestsHelpers.createTranslationKey("translation key 3", populatedGroups[0], populatedProjects[0], false, translationKeysRepository),
      await TestsHelpers.createTranslationKey("plural translation key", populatedGroups[0], populatedProjects[0], true, translationKeysRepository)
    ];

    // Create some languages
    populatedLanguages = [
      await TestsHelpers.createLanguage("Language1", populatedProjects[0], languageRepository),
      await TestsHelpers.createLanguage("Language2", populatedProjects[0], languageRepository),
      await TestsHelpers.createLanguage("Language1", populatedProjects[1], languageRepository)
    ];

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await clearDatabase();
    await app.close();
  });

  describe("Creating translation values", () => {
    afterEach(async () => {
      await translationValuesRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`);
      expect(response.status).toEqual(401);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(response.status).toEqual(403);
    });

    it("Creating translation key with DTO error", async () => {
      // No data
      const noDataResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({});
      expect(noDataResp.status).toEqual(400);

      // Missing language
      const missingLanguageResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", quantity: QuantityString.OTHER});
      expect(missingLanguageResp.status).toEqual(400);

      // Missing name
      const missingNameResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({quantity: QuantityString.ONE, language_id: populatedLanguages[0]});
      expect(missingNameResp.status).toEqual(400);

      // Missing quantity key
      const missingQuantityResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", language_id: populatedLanguages[0]});
      expect(missingQuantityResp.status).toEqual(400);

      // Wrong quantity format
      const wrongQuantityResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", language_id: populatedLanguages[0], quantity_string: "quantity"});
      expect(wrongQuantityResp.status).toEqual(400);
    });

    it("Translation key doesn't exist or isn't linked to the project", async () => {
      // Try inserting a value for a key that doesn't exist
      const keyNotFoundResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}0123/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", language_id: populatedLanguages[0], quantity_string: null});
      expect(keyNotFoundResp.status).toEqual(400);

      // Create a key for project2
      const proj2Group = await TestsHelpers.createGroup("group of project 2", populatedProjects[1], groupRepository);
      const proj2Key = await TestsHelpers.createTranslationKey("key of project 2", proj2Group, populatedProjects[1], false, translationKeysRepository);

      // Try to create a value of this key but targeting project 1
      // Should failed because the is inside another project
      const wrongProjectResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${proj2Key.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", language_id: populatedLanguages[0], quantity_string: null});
      expect(wrongProjectResp.status).toEqual(400);
    });

    it("Language doesn't exist or isn't linked to the project", async () => {
      // Try inserting a value for a language that doesn't exist
      const keyNotFoundResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", language_id: 123456, quantity_string: null});
      expect(keyNotFoundResp.status).toEqual(404);

      // Create a language for project2
      const proj2Language = await TestsHelpers.createLanguage("Language of Project2", populatedProjects[1], languageRepository);

      // Try to create a value for this language but targeting project 1 whereas the language belongs to project 2
      const wrongProjectResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", language_id: proj2Language.id, quantity_string: null});
      expect(wrongProjectResp.status).toEqual(404);
    });

    it("Creating a new translation singular value with a plural Quantity", async () => {
      const singularWithPluralQuantityResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", language_id: populatedLanguages[0].id, quantity_string: QuantityString.OTHER});
      expect(singularWithPluralQuantityResp.status).toEqual(422);
    });

    it("Creating a new translation value (singular)", async () => {
      const createResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", language_id: populatedLanguages[0].id, quantity_string: null});
      expect(createResp.status).toEqual(201);

      const createWithoutQuantityResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", language_id: populatedLanguages[1].id});
      expect(createWithoutQuantityResp.status).toEqual(201);

      const values = await findTranslationValues(populatedTranslationKeys[0].id);
      expect(values.length).toEqual(2);
    });

    it("Creating a new translation plural value with a singular quantity", async () => {
      const createdKey = await TestsHelpers.createTranslationKey("translation key plural", populatedGroups[0], populatedProjects[0], true, translationKeysRepository);

      const pluralWithSingularQuantityResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${createdKey.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", language_id: populatedLanguages[0].id, quantity_string: null});
      expect(pluralWithSingularQuantityResp.status).toEqual(422);

      const pluralWithoutQuantityResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${createdKey.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", language_id: populatedLanguages[0].id});
      expect(pluralWithSingularQuantityResp.status).toEqual(422);
    });

    it("Creating a new translation value (plural)", async () => {
      const createdKey = await TestsHelpers.createTranslationKey("A plural translation key", populatedGroups[0], populatedProjects[0], true, translationKeysRepository);

      const createResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${createdKey.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", language_id: populatedLanguages[0].id, quantity_string: QuantityString.OTHER});
      expect(createResp.status).toEqual(201);

      const values = await findTranslationValues(createdKey.id);
      expect(values.length).toEqual(1);
    });

    it("Duplicated key (combination between key, quantity_string, and language already exists)", async () => {
      const dto = new CreateValueDto({
        name: "Content of the translation value",
        language_id: populatedLanguages[0].id,
        quantity_string: null
      });
      const createResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(dto);
      expect(createResp.status).toEqual(201);

      const createSameValueButOtherLanguageResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Content of the translation value", language_id: populatedLanguages[1].id, quantity_string: null});
      expect(createSameValueButOtherLanguageResp.status).toEqual(201);

      let values = await findTranslationValues(populatedTranslationKeys[0].id);
      expect(values.length).toEqual(2);

      const createDuplicatedResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(dto);
      expect(createDuplicatedResp.status).toEqual(422);

      // Check the values count is still the name
      values = await findTranslationValues(populatedTranslationKeys[0].id);
      expect(values.length).toEqual(2);
    });
  });

  describe("Getting translation values", () => {
    afterEach(async () => {
      await translationValuesRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/123456/translations/${populatedTranslationKeys[0].id}/values`);
      expect(response.status).toEqual(401);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(response.status).toEqual(403);
    });

    it("Translation key not found", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}0123/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(404);
    });

    it("Getting translation values", async () => {
      const value1 = await TestsHelpers.createTranslationValue("translated content", populatedTranslationKeys[0], populatedLanguages[0], null, translationValuesRepository);
      const value2 = await TestsHelpers.createTranslationValue("translated content", populatedTranslationKeys[0], populatedLanguages[1], null, translationValuesRepository);

      const allValuesResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(allValuesResp.status).toEqual(200);
      expect(allValuesResp.body.length).toEqual(2);
      expect(allValuesResp.body[0].id).toEqual(value1.id);
      expect(allValuesResp.body[1].id).toEqual(value2.id);

      const language2Resp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .query({language_id: populatedLanguages[1].id});
      expect(language2Resp.status).toEqual(200);
      expect(language2Resp.body.length).toEqual(1);
      expect(language2Resp.body[0].id).toEqual(value2.id);
    });

    it("Getting translation values details", async () => {
      const value = await TestsHelpers.createTranslationValue("translated content", populatedTranslationKeys[0], populatedLanguages[0], null, translationValuesRepository);

      const allValuesResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values/${value.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(allValuesResp.status).toEqual(404);
    });
  });

  describe("Editing translation values", () => {
    let translationValue: TranslationValue;

    beforeEach(async () => {
      translationValue = await TestsHelpers.createTranslationValue("translated content", populatedTranslationKeys[0], populatedLanguages[0], null, translationValuesRepository);
    });

    afterEach(async () => {
      await translationValuesRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values/${translationValue.id}`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/projects/123456/translations/${populatedTranslationKeys[0].id}/values/${translationValue.id}`);
      expect(response.status).toEqual(401);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values/${translationValue.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(response.status).toEqual(403);
    });

    it("Translation key doesn't exist", async () => {
      const noKeyResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}0123/values/${translationValue.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(noKeyResp.status).toEqual(400);
    });

    it("Translation value doesn't exist", async () => {
      // Translation value doesn't exist
      const response = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values/${translationValue.id}0123`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(400);
    });

    it("Editing translation value for a key that doesn't belong to the project", async () => {
      // Create a key in project2 and a value
      const project2Key = await TestsHelpers.createTranslationKey("key of project 2", populatedGroups[1], populatedProjects[1], false, translationKeysRepository);
      const project2Value = await TestsHelpers.createTranslationValue("value", project2Key, populatedLanguages[2], null, translationValuesRepository);

      // Then try to edit this value but targeting project1 into the path whereas the key belongs to project 1
      const keyNotInProjectResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${project2Key.id}/values/${project2Value.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(keyNotInProjectResp.status).toEqual(400);
    });

    it("Editing translation value for a value that doesn't belong to the key", async () => {
      // Create a key in project 1
      const project1Key = await TestsHelpers.createTranslationKey("key1", populatedGroups[0], populatedProjects[0], false, translationKeysRepository);

      // Create key + value in project 2
      const project2Key = await TestsHelpers.createTranslationKey("key2", populatedGroups[1], populatedProjects[1], false, translationKeysRepository);
      const project2Value = await TestsHelpers.createTranslationValue("key2 value2", project2Key, populatedLanguages[2], null, translationValuesRepository);

      // Try to edit the project1/key1/value2
      const valueNotInKeyResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${project1Key.id}/values/${project2Value.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(valueNotInKeyResp.status).toEqual(400);
    });

    it("Editing translation value with DTO error", async () => {
      // Wrong quantity string format
      const quantityFormatResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values/${translationValue.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({quantity_string: "quantity"});
      expect(quantityFormatResp.status).toEqual(400);

      // Wrong singular quantity string
      const singularValue = await TestsHelpers.createTranslationValue("Singular content", populatedTranslationKeys[0], populatedLanguages[0], null, translationValuesRepository);
      const singularResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values/${singularValue.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({quantity_string: QuantityString.OTHER});
      expect(singularResp.status).toEqual(400);

      // Wrong plural quantity string
      const pluralValue = await TestsHelpers.createTranslationValue("Singular content", populatedTranslationKeys[0], populatedLanguages[0], QuantityString.OTHER, translationValuesRepository);
      const pluralResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values/${pluralValue.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({quantity_string: null});
      expect(pluralResp.status).toEqual(400);
    });

    it("Changing language", async () => {
      const changingLanguageResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values/${translationValue.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({language_id: populatedLanguages[1].id});
      expect(changingLanguageResp.status).toEqual(400);

      const valuesForKey = await findTranslationValues(populatedTranslationKeys[0].id);
      expect(valuesForKey.filter(values => values.language_id == populatedLanguages[0].id).length).toEqual(1);
      expect(valuesForKey.filter(values => values.language_id == populatedLanguages[1].id).length).toEqual(0);
    });

    it("Converting plural into singular", async () => {
      const pluralKey = await TestsHelpers.createTranslationKey("plural key to edit", populatedGroups[0], populatedProjects[0], true, translationKeysRepository);
      await TestsHelpers.createTranslationValue("Plural OTHER", pluralKey, populatedLanguages[0], QuantityString.OTHER, translationValuesRepository);
      await TestsHelpers.createTranslationValue("Plural ONE", pluralKey, populatedLanguages[0], QuantityString.ONE, translationValuesRepository);
      await TestsHelpers.createTranslationValue("Plural ZERO", pluralKey, populatedLanguages[0], QuantityString.ZERO, translationValuesRepository);

      const pluralValues = await findTranslationValues(pluralKey.id);
      expect(pluralValues.length).toEqual(3);

      const changingToSingularResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${pluralKey.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({is_plural: false});
      expect(changingToSingularResp.status).toEqual(200);

      const values = await findTranslationValues(pluralKey.id);
      expect(values.length).toEqual(1);
      expect(values[0].name).toEqual("Plural OTHER");
    });

    it("Converting singular into plural", async () => {
      const singularKey = await TestsHelpers.createTranslationKey("singular key to edit", populatedGroups[0], populatedProjects[0], false, translationKeysRepository);
      await TestsHelpers.createTranslationValue("Singular value", singularKey, populatedLanguages[0], null, translationValuesRepository);

      const singularValues = await findTranslationValues(singularKey.id);
      expect(singularValues.length).toEqual(1);

      const changingToPluralResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${singularKey.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({is_plural: true});
      expect(changingToPluralResp.status).toEqual(200);

      const values = await findTranslationValues(singularKey.id);
      expect(values.length).toEqual(3);
    });

    it("Editing a translation value", async () => {
      const editingValueResp = await request(app.getHttpServer())
        .patch(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values/${translationValue.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "updated content"});
      expect(editingValueResp.status).toEqual(200);

      const valuesForKey = await findTranslationValues(populatedTranslationKeys[0].id);
      expect(valuesForKey.filter(values => values.language_id == populatedLanguages[0].id).length).toEqual(1);
      const foundValue = valuesForKey[0];
      expect(foundValue.id).toEqual(translationValue.id);
      expect(foundValue.name).toEqual("updated content");
    });
  });

  describe("Deleting translation value", () => {
    let translationValue: TranslationValue;

    beforeEach(async () => {
      translationValue = await TestsHelpers.createTranslationValue("translated content", populatedTranslationKeys[0], populatedLanguages[0], null, translationValuesRepository);
    });

    afterEach(async () => {
      await translationValuesRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0]}/values/${translationValue.id}`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/projects/123456/translations/${populatedTranslationKeys[0].id}/values/${translationValue.id}`);
      expect(response.status).toEqual(401);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values/${translationValue.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(response.status).toEqual(403);
    });

    it("Deleting a translation value", async () => {
      const deleteResp = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}/values/${translationValue.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(deleteResp.status).toEqual(204);

      const foundValue = await translationValuesRepository.findOne(translationValue.id);
      expect(foundValue).toBeUndefined();
    });

    it("Deleting a project", async () => {
      // Create a project
      const project = new Project();
      project.name = "Name";
      project.color = "000000";
      const createdProject = await projectRepository.save(project);

      // Create relation
      await TestsHelpers.createProjectRelation(createdProject, populatedUsers[0], Role.Owner, userProjectRepository);

      // Create group and language
      const group = await TestsHelpers.createGroup("default group", createdProject, groupRepository);
      const language = await TestsHelpers.createLanguage("Language1", createdProject, languageRepository);

      // Create a key and a value
      const key = await TestsHelpers.createTranslationKey("translation key 1", group, createdProject, false, translationKeysRepository);
      const value = await TestsHelpers.createTranslationValue("Translation value", key, language, null, translationValuesRepository);

      const deleteResp = await request(app.getHttpServer())
        .delete(`/projects/${createdProject.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(deleteResp.status).toBe(204);

      const foundValues = await findTranslationValues(key.id);
      expect(foundValues.length).toEqual(0);

      const allValues = await translationValuesRepository.find();
      expect(allValues.filter(v => v.id == value.id).length).toEqual(0);
    });

    it("Deleting a language", async () => {
      // Create a project
      const project = new Project();
      project.name = "Project";
      project.color = "123123";
      const createdProject = await projectRepository.save(project);
      await TestsHelpers.createProjectRelation(createdProject, populatedUsers[0], Role.Owner, userProjectRepository);

      // Create a group and a language
      const group = await TestsHelpers.createGroup("Group", createdProject, groupRepository);
      const language = await TestsHelpers.createLanguage("Language1", createdProject, languageRepository);

      // Create a key and a value
      const key = await TestsHelpers.createTranslationKey("translation key 1", group, createdProject, false, translationKeysRepository);
      await TestsHelpers.createTranslationValue("Translation value", key, language, null, translationValuesRepository);

      // Check value has been inserted
      const values = await findTranslationValues(key.id);
      expect(values.length).toEqual(1);

      // Delete the language
      const deleteResp = await request(app.getHttpServer())
        .delete(`/projects/${createdProject.id}/languages/${language.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(deleteResp.status).toBe(204);

      // Check values have been deleted
      const valuesAfterDeletion = await findTranslationValues(key.id);
      expect(valuesAfterDeletion.length).toEqual(0);
    });

    it("Deleting a translation key", async () => {
      const deleteResp = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/translations/${populatedTranslationKeys[0].id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(deleteResp.status).toEqual(204);

      const foundValues = await findTranslationValues(populatedTranslationKeys[0].id);
      expect(foundValues.length).toEqual(0);
    });
  });
});