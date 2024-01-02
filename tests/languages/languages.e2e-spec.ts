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
import Language from "../../src/languages/language.entity";
import CreateLanguageDto from "../../src/projects/dto/create-language.dto";
import * as request from "supertest";
import TestsHelpers from "../helpers/tests.helpers";
import CreateProjectDto from "../../src/projects/dto/create-project.dto";
import TranslationValue from "../../src/translation/translation_value.entity";
import TranslationKey from "../../src/translation/translation_key.entity";
import Group, {DefaultGroupName} from "../../src/groups/group.entity";
import CreateGroupDto from "../../src/groups/dto/create-group.dto";
import CreateKeyDto from "../../src/translation/dto/create-key.dto";

describe("Languages of a project E2E", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let languageRepository: Repository<Language>;
  let valuesRepository: Repository<TranslationValue>;
  let keysRepository: Repository<TranslationKey>;
  let groupRepository: Repository<Group>;

  let populatedProjects: Project[];

  beforeAll(async () => {
    const moduleRef = await TestsHelpers.getTestingModule()
      .overrideGuard(JwtAuthUserGuard)
      .useValue(mockedAuthGuard)
      .compile();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    projectRepository = moduleRef.get<Repository<Project>>(getRepositoryToken(Project));
    userProjectRepository = moduleRef.get<Repository<UserProject>>(getRepositoryToken(UserProject));
    languageRepository = moduleRef.get<Repository<Language>>(getRepositoryToken(Language));
    valuesRepository = moduleRef.get<Repository<TranslationValue>>(getRepositoryToken(TranslationValue));
    keysRepository = moduleRef.get<Repository<TranslationKey>>(getRepositoryToken(TranslationKey));
    groupRepository = moduleRef.get<Repository<Group>>(getRepositoryToken(Group));

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();

    // Populate users and projects in database
    const populatedUsers = await TestsHelpers.populateUsers(userRepository);
    populatedProjects = await TestsHelpers.populateProjects(projectRepository);
    await TestsHelpers.populateDefaultRelations(populatedUsers, populatedProjects, userProjectRepository);
  });

  afterAll(async () => {
    await userRepository.clear();
    await languageRepository.clear();
    await projectRepository.clear();
    await keysRepository.clear();
    await valuesRepository.clear();
    await groupRepository.clear();
    await app.close();
  });

  async function findLanguages(projectId: number): Promise<Language[]> {
    return await languageRepository.find({
      where: {
        project: {
          id: projectId
        }
      }
    });
  }

  async function populateProjectGroup(createdProject: Project): Promise<void> {
    const group: Group = await TestsHelpers.createGroup(DefaultGroupName, createdProject, groupRepository);

    //Populate with one plural key and one singular key
    await TestsHelpers.createTranslationKey("singular_key", group, createdProject, false, keysRepository);
    await TestsHelpers.createTranslationKey("plural_key", group, createdProject, true, keysRepository);
  }

  describe("Creating language", () => {
    afterEach(async () => {
      await languageRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/languages`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/123465/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "English"});
      expect(response.status).toEqual(403);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3)
        .send({name: "English"});
      expect(response.status).toEqual(403);
    });

    it("Creating language with DTO error", async () => {
      const missingDataResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({});
      expect(missingDataResp.status).toEqual(400);

      const tooLongNameResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(
          new CreateLanguageDto({
            name: "This is a really long name for a language. Lorem ipsum dolor sit amet, " +
              "consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
          })
        );
      expect(tooLongNameResp.status).toEqual(400);
    });

    it("Creating a language without existing values", async () => {
      await populateProjectGroup(populatedProjects[0]);

      const languageResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(new CreateLanguageDto({name: "EN"}));

      expect(languageResp.status).toEqual(201);

      const languages = await findLanguages(populatedProjects[0].id);

      expect(languages).not.toBeNull();
      expect(languages.length).toEqual(1);

      const createdLanguage: Language = languages[0];

      const values = await valuesRepository.find({where: {languageId: createdLanguage.id}});

      expect(values.length).toBe(0);
    });

    it("Creating a language with existing values", async () => {
      const languageResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(new CreateLanguageDto({
          name: "fr",
          groups: [
            // This group exists in the project, but the keys and values should be created
            new CreateGroupDto({
              name: "common",
              keys: [
                new CreateKeyDto({
                  name: "singular_key",
                  isPlural: false,
                  values: [
                    new CreateGroupDto({
                      name: "singular_key_fr",
                      quantityString: null
                    })
                  ],
                }),
                new CreateKeyDto({
                  name: "plural_key",
                  isPlural: true,
                  values: [
                    new CreateGroupDto({
                      name: "plural_key_fr_zero",
                      quantityString: "zero"
                    }), new CreateGroupDto({
                      name: "plural_key_fr_one",
                      quantityString: "one"
                    }), new CreateGroupDto({
                      name: "plural_key_fr_other",
                      quantityString: "other"
                    })
                  ],
                })
              ]
            }),
            // This group is new and should be created
            new CreateGroupDto({
              name: "new_group",
              keys: [
                new CreateKeyDto({
                  name: "singular_key",
                  isPlural: false,
                  values: [
                    new CreateGroupDto({
                      name: "singular_key_fr",
                      quantityString: null
                    })
                  ],
                }),
                new CreateKeyDto({
                  name: "plural_key",
                  isPlural: true,
                  values: [
                    new CreateGroupDto({
                      name: "plural_key_fr_zero",
                      quantityString: "zero"
                    }), new CreateGroupDto({
                      name: "plural_key_fr_one",
                      quantityString: "one"
                    }), new CreateGroupDto({
                      name: "plural_key_fr_other",
                      quantityString: "other"
                    })
                  ],
                })
              ]
            })
          ]
        }));

      expect(languageResp.status).toEqual(201);

      const languages = await findLanguages(populatedProjects[0].id);

      expect(languages).not.toBeNull();
      expect(languages.length).toEqual(1);

      const createdLanguage: Language = languages[0];

      const values = await valuesRepository.find({where: {languageId: createdLanguage.id}});
      expect(values.length).toBe(8);
      values.forEach(value => {
        if (value.quantityString) {
          expect(value.name).toBe(`plural_key_fr_${value.quantityString}`);
        } else {
          expect(value.name).toBe(`singular_key_fr`);
        }
      })
    });

    it("Already existing language", async () => {
      const createLanguageResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "language"});
      expect(createLanguageResp.status).toEqual(201);

      const duplicatedLanguageResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "language"});
      expect(duplicatedLanguageResp.status).toEqual(422);
    });

    it("Creating a project from the API", async () => {
      const dto = new CreateProjectDto({
        name: "New project",
        description: "Lorem ipsum dolor sit amet",
        color: "000000",
        languages: ["fr"]
      });

      const createdProjectResp = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(dto);
      expect(createdProjectResp.status).toBe(201);

      const languages = await findLanguages(createdProjectResp.body.id);
      expect(languages.length).toEqual(1);
      expect(languages[0].name).toEqual("fr");
    });
  });

  describe("Getting language", () => {
    afterEach(async () => {
      await languageRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/languages`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/123465/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(404);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(response.status).toEqual(403);
    });

    it("Non existing language", async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/123465/languages/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(404);
    });

    it("Getting languages", async () => {
      const noLanguageResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(noLanguageResp.status).toEqual(200);
      expect(noLanguageResp.body.length).toEqual(0);

      const createLanguageResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(new CreateLanguageDto({name: "English"}));
      expect(createLanguageResp.status).toEqual(201);

      const languageResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(languageResp.status).toEqual(200);
      expect(languageResp.body.length).toEqual(1);

      const languageDetailsResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/languages/${createLanguageResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(languageDetailsResp.status).toEqual(200);
      expect(languageDetailsResp.body.id).toEqual(createLanguageResp.body.id);
      expect(languageDetailsResp.body.name).toEqual(createLanguageResp.body.name);
    });
  });

  describe("Editing language", () => {
    afterEach(async () => {
      await languageRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .put(`/projects/${populatedProjects[0].id}/languages/1`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .put(`/projects/123465/languages/1`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(403);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .put(`/projects/${populatedProjects[0].id}/languages/1`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(response.status).toEqual(403);
    });

    it("Non existing language", async () => {
      const response = await request(app.getHttpServer())
        .put(`/projects/${populatedProjects[0].id}/languages/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Lorem ipsum"});
      expect(response.status).toEqual(404);
    });

    it("Editing language with DTO errors", async () => {
      const createLanguageResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(new CreateLanguageDto({name: "English"}));
      expect(createLanguageResp.status).toEqual(201);

      const missingDataResp = await request(app.getHttpServer())
        .put(`/projects/${populatedProjects[0].id}/languages/${createLanguageResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({});
      expect(missingDataResp.status).toEqual(400);

      const tooLongNameResp = await request(app.getHttpServer())
        .put(`/projects/${populatedProjects[0].id}/languages/${createLanguageResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(
          new CreateLanguageDto({
            name: "This is a really long name for a language. Lorem ipsum dolor sit amet, " +
              "consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
          })
        );
      expect(tooLongNameResp.status).toEqual(400);
    });

    it("Editing a language", async () => {
      const createLanguageResp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(new CreateLanguageDto({name: "French"}));
      expect(createLanguageResp.status).toEqual(201);

      const editLanguageDto = new CreateLanguageDto({name: "Français"});
      const editingResp = await request(app.getHttpServer())
        .put(`/projects/${populatedProjects[0].id}/languages/${createLanguageResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(editLanguageDto);
      expect(editingResp.status).toEqual(200);

      const gettingDetailsResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/languages/${createLanguageResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(gettingDetailsResp.status).toEqual(200);
      expect(gettingDetailsResp.body.name).not.toEqual("French");
      expect(gettingDetailsResp.body.name).toEqual(editLanguageDto.name);
    });

    it("Already existing language", async () => {
      const language1Resp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Language #1"});
      expect(language1Resp.status).toEqual(201);

      const language2Resp = await request(app.getHttpServer())
        .post(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Language #2"});
      expect(language2Resp.status).toEqual(201);

      const editLanguageDto = new CreateLanguageDto({name: "Language #1"});
      const editingResp = await request(app.getHttpServer())
        .put(`/projects/${populatedProjects[0].id}/languages/${language2Resp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(editLanguageDto);
      expect(editingResp.status).toEqual(422);

      const gettingDetailsResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/languages/${language2Resp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(gettingDetailsResp.status).toEqual(200);
      expect(gettingDetailsResp.body.name).toEqual("Language #2");
      expect(gettingDetailsResp.body.name).not.toEqual(editLanguageDto.name);
    });
  });

  describe("Deleting language", () => {
    afterEach(async () => {
      await languageRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/languages/1`);
      expect(response.status).toEqual(401);
    });

    it("Non existing project", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/projects/123465/languages/1`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(403);
    });

    it("User hasn't access to the project", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/languages/1`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);
      expect(response.status).toEqual(403);
    });

    it("Non existing language", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/languages/123456`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(response.status).toEqual(404);
    });

    it("Deletion of a language", async () => {
      const language1 = new Language();
      language1.project = populatedProjects[0];
      language1.name = "Language #1";
      await languageRepository.save(language1);

      const language2 = new Language();
      language2.project = populatedProjects[0];
      language2.name = "Language #2";
      await languageRepository.save(language2);

      const languagesResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(languagesResp.status).toEqual(200);
      expect(languagesResp.body.length).toEqual(2);

      const deleteResp = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}/languages/${languagesResp.body[0].id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(deleteResp.status).toEqual(204);

      const updatedLanguagesResp = await request(app.getHttpServer())
        .get(`/projects/${populatedProjects[0].id}/languages`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(updatedLanguagesResp.status).toEqual(200);
      expect(updatedLanguagesResp.body.length).toEqual(1);
    });

    it("Deletion of a project", async () => {
      const language1 = new Language();
      language1.name = "Language1";
      language1.project = populatedProjects[0];
      await languageRepository.save(language1);

      const language2 = new Language();
      language2.name = "Language2";
      language2.project = populatedProjects[0];
      await languageRepository.save(language2);

      const deleteResp = await request(app.getHttpServer())
        .delete(`/projects/${populatedProjects[0].id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(deleteResp.status).toBe(204);

      const projectLanguages = await languageRepository.find({
        where: {
          project: {
            id: populatedProjects[0].id
          }
        }
      });
      expect(projectLanguages.length).toEqual(0);
    });
  });
});