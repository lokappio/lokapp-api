import {INestApplication} from "@nestjs/common";
import {getRepositoryToken} from "@nestjs/typeorm";
import {Test} from "@nestjs/testing";
import UsersModule from "../../src/users/users.module";
import AuthModule from "../../src/auth/auth.module";
import TestDatabaseModule from "../database/test-database.module";
import User from "../../src/users/user.entity";
import {Repository} from "typeorm";
import {mockedAuthGuard} from "../common/mocked-auth-guard";
import {HttpExceptionFilter} from "../../src/common/http-error.filter";
import {TestQueryExceptionFilter} from "../common/test-query-error.filter";
import {JwtAuthUserGuard} from "../../src/auth/guards/jwt-auth-user.guard";
import * as request from "supertest";
import Project from "../../src/projects/project.entity";
import UserProject from "../../src/users-projects/user_project.entity";
import AuthTestsHelpers from "../auth/auth-tests.helpers";
import ProjectsModule from "../../src/projects/projects.module";
import EdgeHelper from "../helpers/EdgeHelper";
import ProjectsTestHelpers from "../projects/projects-test.helpers";
import Role from "../../src/roles/role.enum";
import TranslationKey from "../../src/translation/translation_key.entity";
import TranslationModule from "../../src/translation/translation.module";
import KeyHelper from "../helpers/KeyHelper";
import TranslationValue from "../../src/translation/translation_value.entity";
import Language from "../../src/languages/language.entity";
import LanguageHelper from "../helpers/LanguageHelper";
import CreateValueDto from "../../src/translation/dto/create-value.dto";
import QuantityString from "../../src/translation/quantity_string.enum";
import UpdateValueDto from "../../src/translation/dto/update-value.dto";
import ValueHelper from "../helpers/ValueHelper";

describe("Value edge", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let keyRepository: Repository<TranslationKey>;
  let valueRepository: Repository<TranslationValue>;
  let languageRepository: Repository<Language>;

  const userAId = "user_1_ID";
  const userBId = "user_2_ID";

  const userA = new User(userAId, "userA");
  const userB = new User(userBId, "UserB");

  const project = new Project();
  let projectId: number;

  let langA = new Language();
  let langB = new Language();

  let keyA = new TranslationKey();
  let keyB = new TranslationKey();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        UsersModule,
        AuthModule,
        ProjectsModule,
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
          provide: getRepositoryToken(TranslationKey),
          useClass: Repository
        },
        {
          provide: getRepositoryToken(TranslationValue),
          useClass: Repository
        },
        {
          provide: getRepositoryToken(Language),
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
    keyRepository = moduleRef.get<Repository<TranslationKey>>(getRepositoryToken(TranslationKey));
    valueRepository = moduleRef.get<Repository<TranslationValue>>(getRepositoryToken(TranslationValue));
    languageRepository = moduleRef.get<Repository<Language>>(getRepositoryToken(Language));

    //Setup users
    userA.email = "usera@email.com";
    userB.email = "userb@email.com";
    await userRepository.save(userA);
    await userRepository.save(userB);

    //Setup project
    project.name = "project name";
    project.color = "FFFFFF";
    await projectRepository.save(project);
    const relation = new UserProject();
    relation.project = (await projectRepository.findOne({where: {name: project.name}}));
    relation.user = userA;
    relation.role = Role.Owner;
    await userProjectRepository.save(relation);
    projectId = relation.project.id;

    //Setup languages
    langA.name = "langA";
    langA.project = project;
    langB.name = "langB";
    langB.project = project;
    langA = await LanguageHelper.dbAddLanguage(languageRepository, langA);
    langB = await LanguageHelper.dbAddLanguage(languageRepository, langB);

    //Setup keys
    keyA.group = null;
    keyB.group = null;
    keyA.is_plural = false;
    keyB.is_plural = true;
    keyA.name = "keyA";
    keyB.name = "keyB";
    keyA.project = project;
    keyB.project = project;
    keyA = await KeyHelper.dbAddKey(keyRepository, keyA);
    keyB = await KeyHelper.dbAddKey(keyRepository, keyB);

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await keyRepository.clear();
    await valueRepository.clear();
    await languageRepository.clear();
    await app.close();
  });

  beforeEach(async () => {
    await valueRepository.clear();
  });

  describe("Create value", () => {
    const createValueDto = new CreateValueDto({
      name: "valueName",
      quantity_string: null
    });

    beforeEach(async () => {
      createValueDto.language_id = langA.id;
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyA.id}/values`)
        .send(createValueDto);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${123456}/translations/${keyA.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(createValueDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyA.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId)
        .send(createValueDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("KeyId not found", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/123456/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(createValueDto);
      await EdgeHelper.entityNotFound(req);
    });

    it("Language id not found", async () => {
      createValueDto.language_id = 123456;
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyA.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(createValueDto);
      await EdgeHelper.entityNotFound(req);
    });

    it("Combinaison between key, quantity_string, and language already exists", async () => {
      const req = await request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyA.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(createValueDto);
      expect(req.status).toBe(201);
      const req2 = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyA.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({quantity_string: null, language_id: langA.id, name: "new name"});
      await EdgeHelper.entityAlreadyExists(req2);
    });

    it("Wrong quantity_string on dto key singular", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyA.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({quantity_string: "quantity", language_id: langA.id, name: "new name"});
      await EdgeHelper.requestWithInvalidDto(req);

      const req2 = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyA.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({quantity_string: QuantityString.ZERO, language_id: langA.id, name: "new name"});
      await EdgeHelper.quantityStringNotValid(req2);

      const req3 = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyA.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({quantity_string: QuantityString.OTHER, language_id: langA.id, name: "new name"});
      await EdgeHelper.quantityStringNotValid(req3);

      const req4 = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyA.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({quantity_string: QuantityString.OTHER, language_id: langA.id, name: "new name"});
      await EdgeHelper.quantityStringNotValid(req4);
    });

    it("Wrong quantity_string on dto key plural", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyB.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({quantity_string: "quantity", language_id: langA.id, name: "new name"});
      await EdgeHelper.requestWithInvalidDto(req);

      const req2 = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyB.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({quantity_string: null, language_id: langA.id, name: "new name"});
      await EdgeHelper.quantityStringNotValid(req2);
    });

    it("Wrong dto on request", async () => {
      const req = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyA.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({language_id: langA.id, name: "new name"});
      await EdgeHelper.requestWithInvalidDto(req);

      const req2 = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyA.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({quantity_string: null, name: "new name"});
      await EdgeHelper.requestWithInvalidDto(req2);

      const req3 = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyA.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({quantity_string: null, language_id: langA.id});
      await EdgeHelper.requestWithInvalidDto(req3);

      const req4 = request(app.getHttpServer())
        .post(`/projects/${projectId}/translations/${keyA.id}/values`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({});
      await EdgeHelper.requestWithInvalidDto(req4);
    });
  });

  describe("Update value", () => {
    const updateValueDto = new UpdateValueDto({
      name: "updated name"
    });
    let value = new TranslationValue();

    beforeEach(async () => {
      await valueRepository.clear();
      value.key = keyA;
      value.language = langA;
      value.quantity_string = null;
      value.name = "value name";
      value = await ValueHelper.dbAddValue(valueRepository, value);
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyA.id}/values/${value.id}`)
        .send(updateValueDto);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${123456}/translations/${keyA.id}/values/${value.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(updateValueDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyA.id}/values/${value.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId)
        .send(updateValueDto);
      await EdgeHelper.roleGuardError(req);
    });

    it("KeyID not found", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/123456/values/${value.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(updateValueDto);
      await EdgeHelper.entityNotFound(req);
    });

    it("ValueID not found", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyA.id}/values/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(updateValueDto);
      await EdgeHelper.entityNotFound(req);
    });

    it("Relation between keyId and valueId not found", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyB.id}/values/${value.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send(updateValueDto);
      await EdgeHelper.entityNotFound(req);
    });

    it("Wrong dto on request", async () => {
      const req = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyA.id}/values/${value.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({name: ""});
      await EdgeHelper.requestWithInvalidDto(req);

      const req2 = request(app.getHttpServer())
        .patch(`/projects/${projectId}/translations/${keyA.id}/values/${value.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId)
        .send({});
      await EdgeHelper.requestWithInvalidDto(req2);
    });
  });

  describe("Delete value", () => {
    let value = new TranslationValue();

    beforeEach(async () => {
      await valueRepository.clear();
      value.key = keyA;
      value.language = langA;
      value.name = "valuename";
      value.quantity_string = null;
      value = await ValueHelper.dbAddValue(valueRepository, value);
    });

    it("No JWT on request", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectId}/translations/${keyA.id}/values/${value.id}`);
      await EdgeHelper.requestWithoutJWT(req);
    });

    it("Project not found", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${123456}/translations/${keyA.id}/values/${value.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.roleGuardError(req);
    });

    it("Project not owned by user", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectId}/translations/${keyA.id}/values/${value.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userBId);
      await EdgeHelper.roleGuardError(req);
    });

    it("KeyID not found", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectId}/translations/123456/values/${value.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.entityNotFound(req);
    });

    it("ValueID not found", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectId}/translations/${keyA.id}/values/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.entityNotFound(req);
    });

    it("Relation between keyID and valueID not found", async () => {
      const req = request(app.getHttpServer())
        .delete(`/projects/${projectId}/translations/${keyB.id}/values/${value.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userAId);
      await EdgeHelper.entityNotFound(req);
    });
  });
});