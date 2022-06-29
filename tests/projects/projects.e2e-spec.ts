import {INestApplication} from "@nestjs/common";
import {getRepositoryToken} from "@nestjs/typeorm";
import User from "../../src/users/user.entity";
import {Repository} from "typeorm";
import {mockedAuthGuard} from "../common/mocked-auth-guard";
import {HttpExceptionFilter} from "../../src/common/http-error.filter";
import {TestQueryExceptionFilter} from "../common/test-query-error.filter";
import {JwtAuthUserGuard} from "../../src/auth/guards/jwt-auth-user.guard";
import Project from "../../src/projects/project.entity";
import UserProject from "../../src/users-projects/user_project.entity";
import CreateProjectDto from "../../src/projects/dto/create-project.dto";
import TestsHelpers from "../helpers/tests.helpers";
import * as request from "supertest";
import Role from "../../src/roles/role.enum";
import Language from "../../src/languages/language.entity";

describe("Projects E2E", () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let userProjectRepository: Repository<UserProject>;
  let languageRepository: Repository<Language>;

  beforeAll(async () => {
    const moduleRef = await TestsHelpers.getTestingModule()
      .overrideGuard(JwtAuthUserGuard)
      .useValue(mockedAuthGuard)
      .compile();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    projectRepository = moduleRef.get<Repository<Project>>(getRepositoryToken(Project));
    userProjectRepository = moduleRef.get<Repository<UserProject>>(getRepositoryToken(UserProject));
    languageRepository = moduleRef.get<Repository<Language>>(getRepositoryToken(Language));

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(), new TestQueryExceptionFilter());
    await app.init();

    await TestsHelpers.populateUsers(userRepository);
  });

  afterAll(async () => {
    await userRepository.clear();
    await projectRepository.clear();
    await userProjectRepository.clear();
    await app.close();
  });

  describe("Creating project", () => {
    afterEach(async () => {
      await projectRepository.clear();
      await userProjectRepository.clear();
      await languageRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      const response = await request(app.getHttpServer())
        .post("/projects")
        .send(new CreateProjectDto({
          name: "Unauthenticated project",
          color: "123456"
        }));
      expect(response.status).toEqual(401);
    });

    it("Creating project with DTO errors", async () => {
      const noColorResp = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Missing color parameter", language: "fr"});
      expect(noColorResp.status).toEqual(400);
      expect(noColorResp.body.message).toBe("Validation failed");

      const noNameResp = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({color: "123456", language: "fr"});
      expect(noNameResp.status).toEqual(400);
      expect(noNameResp.body.message).toBe("Validation failed");

      const noDataResp = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({});
      expect(noDataResp.status).toEqual(400);
      expect(noDataResp.body.message).toBe("Validation failed");

      const tooLongNameResp = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: "This is a really long name for a project. The API requires a length of 80 characters maximum",
          color: "000000",
          language: "fr"
        });
      expect(tooLongNameResp.status).toEqual(400);

      const colorFormatResp = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Name", color: "FGHIJK", language: "fr"});
      expect(colorFormatResp.status).toEqual(400);

      const colorLengthResp = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Name", color: "112233445566", language: "fr"});
      expect(colorLengthResp.status).toEqual(400);
    });

    it("Creating project with a language", async () => {
      const projectsCount = (await projectRepository.find()).length;

      const dto = new CreateProjectDto({
        name: "New project name",
        description: "Lorem ipsum dolor sit amet",
        color: "112233",
        languages: ["fr"]
      });

      const createdProjectResp = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(dto);
      expect(createdProjectResp.status).toBe(201);
      expect(createdProjectResp.body.id).not.toBeNull();
      expect(createdProjectResp.body.name).toEqual(dto.name);
      expect(createdProjectResp.body.description).toEqual(dto.description);
      expect(createdProjectResp.body.color).toEqual(dto.color);

      const updatedProjectsCount = (await projectRepository.find()).length;
      expect(updatedProjectsCount).toEqual(projectsCount + 1);

      const languages = await languageRepository.find({
        where: {
          projectId: createdProjectResp.body.id
        }
      });
      expect(languages.length).toEqual(1);
      expect(languages[0].name).toEqual(dto.languages[0]);

      const relations = await userProjectRepository.find();
      expect(relations.length).toEqual(1);
      expect(relations[0].role).toEqual(Role.Owner);
      expect(relations[0].userId).toEqual(TestsHelpers.MOCKED_USER_ID_1);
      expect(relations[0].projectId).toEqual(createdProjectResp.body.id);
    });

    it("Creating project with multiple languages", async () => {
      const projectsCount = (await projectRepository.find()).length;

      const dto = new CreateProjectDto({
        name: "New project name",
        description: "Lorem ipsum dolor sit amet",
        color: "112233",
        languages: ["fr", "en"]
      });

      const createdProjectResp = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(dto);
      expect(createdProjectResp.status).toBe(201);
      expect(createdProjectResp.body.id).not.toBeNull();
      expect(createdProjectResp.body.name).toEqual(dto.name);
      expect(createdProjectResp.body.description).toEqual(dto.description);
      expect(createdProjectResp.body.color).toEqual(dto.color);

      const updatedProjectsCount = (await projectRepository.find()).length;
      expect(updatedProjectsCount).toEqual(projectsCount + 1);

      const languages = await languageRepository.find({
        where: {
          projectId: createdProjectResp.body.id
        }
      });
      languages.sort((a, b) => a.name.localeCompare(b.name));

      expect(languages.length).toEqual(2);
      expect(languages[0].name).toEqual("en");
      expect(languages[1].name).toEqual("fr");

      const relations = await userProjectRepository.find();
      expect(relations.length).toEqual(1);
      expect(relations[0].role).toEqual(Role.Owner);
      expect(relations[0].userId).toEqual(TestsHelpers.MOCKED_USER_ID_1);
      expect(relations[0].projectId).toEqual(createdProjectResp.body.id);
    });

    it("Creating project without language", async () => {
      const projectsCount = (await projectRepository.find()).length;

      const dto = new CreateProjectDto({
        name: "New project name",
        description: "Lorem ipsum dolor sit amet",
        color: "112233"
      });

      const createdProjectResp = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send(dto);
      expect(createdProjectResp.status).toBe(201);

      const updatedProjectsCount = (await projectRepository.find()).length;
      expect(updatedProjectsCount).toEqual(projectsCount + 1);

      const languages = await languageRepository.find({
        where: {
          projectId: createdProjectResp.body.id
        }
      });
      expect(languages.length).toEqual(0);

      const relation = await userProjectRepository.findOne({
        where: {
          projectId: createdProjectResp.body.id,
          userId: TestsHelpers.MOCKED_USER_ID_1
        }
      });
      expect(relation).not.toBeUndefined();
      expect(relation.role).toEqual(Role.Owner);
    });

    afterAll(async () => {
      await projectRepository.clear();
      await userProjectRepository.clear();
      await languageRepository.clear();
    });
  });

  describe("Getting projects", () => {
    afterEach(async () => {
      // After each test, clear projects and relations with users
      await projectRepository.clear();
      await userProjectRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      // Cannot get the list of project
      const projectsResp = await request(app.getHttpServer())
        .get("/projects");
      expect(projectsResp.status).toEqual(401);

      // Create a project (being authenticated)
      const createdProject = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: "Project",
          description: "Lorem ipsum dolor sit amet",
          color: "987654",
          language: "de"
        });
      expect(createdProject.status).toEqual(201);

      // Then check a user without JWT can't access it
      const projectResp = await request(app.getHttpServer())
        .get("/projects/" + createdProject.body.id);
      expect(projectResp.status).toEqual(401);
    });

    it("Getting a non-existing project", async () => {
      const projectsResp = await request(app.getHttpServer())
        .get("/projects/132456789")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);

      expect(projectsResp.status).toEqual(404);
    });

    it("Getting an empty list of projects", async () => {
      // Get the projects as MOCKED_USER_ID_3 (has no project)
      const projectsResp = await request(app.getHttpServer())
        .get("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_3);

      expect(projectsResp.status).toEqual(200);
      expect(projectsResp.body.length).toEqual(0);
    });

    it("Getting a list of projects", async () => {
      // Create 2 projects
      const firstProject = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: "New project name",
          description: "Lorem ipsum dolor sit amet",
          color: "112233",
          language: "fr"
        });
      expect(firstProject.status).toEqual(201);

      const secondProject = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: "New project name",
          description: "Lorem ipsum dolor sit amet",
          color: "112233",
          language: "fr"
        });
      expect(secondProject.status).toEqual(201);

      // Get projects and expect to get 2
      const projectsResp = await request(app.getHttpServer())
        .get("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(projectsResp.status).toEqual(200);
      expect(projectsResp.body.length).toEqual(2);

      // Check there are two relations for MOCKED_USER_ID_1 user
      const relations = await userProjectRepository.find({
        where: {
          user: {
            id: TestsHelpers.MOCKED_USER_ID_1
          }
        }
      });
      expect(relations.length).toEqual(2);
      expect(projectsResp.body.length).toEqual(relations.length);
    });

    it("Getting project's details", async () => {
      // Create a project
      const createdProject = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: "A new project",
          description: "This is a new project",
          color: "000000",
          language: "en"
        });
      expect(createdProject.status).toEqual(201);

      const projectResp = await request(app.getHttpServer())
        .get(`/projects/${createdProject.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);

      expect(projectResp.status).toEqual(200);
      expect(projectResp.body.id).toEqual(createdProject.body.id);
    });

    it("Trying to access a project of another user", async () => {
      // Create a project as MOCKED_USER_ID_1
      const createdProject = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: "A new project",
          description: "This project belongs to MOCKED_USER_ID_1",
          color: "000000",
          language: "en"
        });
      expect(createdProject.status).toEqual(201);

      // Try to access this project as MOCKED_USER_ID_2
      const projectResp = await request(app.getHttpServer())
        .get(`/projects/${createdProject.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_2);

      expect(projectResp.status).toEqual(403);
    });

    afterAll(async () => {
      await projectRepository.clear();
      await userProjectRepository.clear();
    });
  });

  describe("Updating projects", () => {
    afterEach(async () => {
      await userProjectRepository.clear();
      await projectRepository.clear();
    });

    it("Unauthenticated user (without JWT)", async () => {
      // Create a project (being authenticated)
      const createdProject = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: "Project about to be edited",
          description: "Lorem ipsum dolor sit amet",
          color: "123456",
          language: "fr"
        });
      expect(createdProject.status).toEqual(201);

      // Then check a user without JWT can't edit it
      const projectResp = await request(app.getHttpServer())
        .put(`/projects/${createdProject.body.id}`)
        .send({name: "The name", color: "123456", description: "The description"});
      expect(projectResp.status).toEqual(401);
    });

    it("Editing a project not belonging to the user", async () => {
      // Create a project as MOCKED_USER_ID_1
      const createdProject = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: "Project about to be edited by MOCKED_USER_ID_2",
          description: "Lorem ipsum",
          color: "112233",
          language: "fr"
        });
      expect(createdProject.status).toEqual(201);

      // Then try to edit it as MOCKED_USER_ID_2
      const projectResp = await request(app.getHttpServer())
        .put(`/projects/${createdProject.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_2)
        .send({name: "The name", color: "123456", description: "The description"});
      expect(projectResp.status).toEqual(403);
    });

    it("Editing a non-existing project", async () => {
      const projectResp = await request(app.getHttpServer())
        .put(`/projects/123456789`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_2)
        .send({name: "The name", color: "123456", description: "The description"});
      expect(projectResp.status).toEqual(403);
    });

    it("Editing project with DTO errors", async () => {
      // Create a project
      const projectResp = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: "Editable project",
          description: "The description of this project",
          color: "654321",
          language: "en"
        });
      expect(projectResp.status).toEqual(201);

      const noColorResp = await request(app.getHttpServer())
        .put(`/projects/${projectResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Missing color parameter", description: ""});
      expect(noColorResp.status).toEqual(400);

      const noNameResp = await request(app.getHttpServer())
        .put(`/projects/${projectResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({color: "000000", description: ""});
      expect(noNameResp.status).toEqual(400);

      const noDescription = await request(app.getHttpServer())
        .put(`/projects/${projectResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Name", color: "000000"});
      expect(noDescription.status).toEqual(400);

      const noDataResp = await request(app.getHttpServer())
        .put(`/projects/${projectResp.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({});
      expect(noDataResp.status).toEqual(400);
    });

    it("Editing a project", async () => {
      // Create a project
      const createdProject = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: "Project about to be edited",
          description: "Lorem ipsum dolor sit amet",
          color: "123456",
          language: "fr"
        });
      expect(createdProject.status).toEqual(201);

      const editedResp = await request(app.getHttpServer())
        .put(`/projects/${createdProject.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: "Edited name",
          color: "FF0000",
          description: "Edited description"
        });
      expect(editedResp.status).toEqual(200);
      expect(editedResp.body.id).toEqual(createdProject.body.id);
      expect(editedResp.body.name).toEqual("Edited name");
      expect(editedResp.body.color).toEqual("FF0000");
      expect(editedResp.body.description).not.toBeNull();
      expect(editedResp.body.description).toEqual("Edited description");

      const descriptionErasedResp = await request(app.getHttpServer())
        .put(`/projects/${createdProject.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({
          name: "Another name again",
          color: "000000",
          description: null
        });
      expect(descriptionErasedResp.status).toEqual(200);
      expect(descriptionErasedResp.body.id).toEqual(createdProject.body.id);
      expect(descriptionErasedResp.body.name).toEqual("Another name again");
      expect(descriptionErasedResp.body.color).toEqual("000000");
      expect(descriptionErasedResp.body.description).toBeNull();
    });

    afterEach(async () => {
      // Clear all relations between users and projects
      await userProjectRepository.clear();
    });

    afterAll(async () => {
      await projectRepository.clear();
      await userProjectRepository.clear();
    });
  });

  describe("Deleting project", () => {
    it("Unauthenticated user (without JWT)", async () => {
      // Create a project (being authenticated)
      const createdProject = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Will be deleted", color: "123456", language: "fr"});
      expect(createdProject.status).toEqual(201);

      // Then check the project can't be deleted if no JWT
      const projectResp = await request(app.getHttpServer())
        .delete(`/projects/${createdProject.body.id}`);
      expect(projectResp.status).toEqual(401);
    });

    it("Deleting a project not belonging to the user", async () => {
      // Create a project as MOCKED_USER_ID_1
      const createdProject = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Will be deleted", color: "123456", language: "fr"});

      // Then try to delete it as MOCKED_USER_ID_2
      const projectResp = await request(app.getHttpServer())
        .delete(`/projects/${createdProject.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_2);
      expect(projectResp.status).toEqual(403);
    });

    it("Deleting a non-existing project", async () => {
      const projectResp = await request(app.getHttpServer())
        .delete(`/projects/123456789`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_2);
      expect(projectResp.status).toEqual(403);
    });

    it("Deleting a project", async () => {
      // Create a project
      const createdProject = await request(app.getHttpServer())
        .post("/projects")
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1)
        .send({name: "Will be deleted", color: "123456", language: "fr"});

      // Delete this project
      const deleteResp = await request(app.getHttpServer())
        .delete(`/projects/${createdProject.body.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(deleteResp.status).toBe(204);

      // Expect to not be able to find the project anymore
      const foundProject = await projectRepository.findOne(createdProject.body.id);
      expect(foundProject).toBeUndefined();

      const relations = await userProjectRepository.find({
        where: {
          projectId: createdProject.body.id
        }
      });
      expect(relations.length).toEqual(0);
    });

    it("Deleting a project with several users", async () => {
      // Create project
      const project = new Project();
      project.name = "Project of 2 users";
      project.description = "Project about to be deleted";
      project.color = "654987";
      await projectRepository.save(project);

      // Create relation for user1
      const relation1 = new UserProject();
      relation1.user = await userRepository.findOne(TestsHelpers.MOCKED_USER_ID_1);
      relation1.project = project;
      relation1.role = Role.Owner;
      await userProjectRepository.save(relation1);

      // Create relation for user2
      const relation2 = new UserProject();
      relation2.user = await userRepository.findOne(TestsHelpers.MOCKED_USER_ID_2);
      relation2.project = project;
      relation2.role = Role.Manager;
      await userProjectRepository.save(relation2);

      // Check number of relations (expect 2)
      const relationsCount = await userProjectRepository.find({
        where: {
          projectId: project.id
        }
      });
      expect(relationsCount.length).toEqual(2);

      // Delete this project
      const deleteResp = await request(app.getHttpServer())
        .delete(`/projects/${project.id}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", TestsHelpers.MOCKED_USER_ID_1);
      expect(deleteResp.status).toBe(204);

      // Expect to not be able to find the project anymore
      const foundProject = await projectRepository.findOne(project.id);
      expect(foundProject).toBeUndefined();

      const relationsCountAfterDeletion = await userProjectRepository.find({
        where: {
          projectId: project.id
        }
      });
      expect(relationsCountAfterDeletion.length).toEqual(0);
    });

    afterAll(async () => {
      await projectRepository.clear();
      await userProjectRepository.clear();
    });
  });
});