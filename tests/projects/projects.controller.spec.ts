import {Test} from "@nestjs/testing";
import ProjectsController from "../../src/projects/projects.controller";
import Project from "../../src/projects/project.entity";
import {getRepositoryToken} from "@nestjs/typeorm";
import {DeleteResult, Repository} from "typeorm";
import {NotFoundException} from "@nestjs/common";
import CreateProjectDto from "../../src/projects/dto/create-project.dto";
import ProjectsModule from "../../src/projects/projects.module";
import TestDatabaseModule from "../database/test-database.module";
import CreateLanguageDto from "../../src/projects/dto/create-language.dto";
import Language from "../../src/languages/language.entity";
import ProjectsService from "../../src/projects/projects.service";

describe("ProjectsController", function () {
  let projectsController: ProjectsController;
  let projectsService: ProjectsService;
  let projectsRepository: Repository<Project>;
  let languagesRepository: Repository<Language>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ProjectsModule,
        TestDatabaseModule
      ],
      providers: [
        {
          provide: getRepositoryToken(Project),
          useClass: Repository
        },
        {
          provide: getRepositoryToken(Language),
          useClass: Repository
        }
      ]
    }).compile();
    projectsRepository = moduleRef.get<Repository<Project>>(getRepositoryToken(Project));
    languagesRepository = moduleRef.get<Repository<Language>>(getRepositoryToken(Language));
    projectsController = moduleRef.get<ProjectsController>(ProjectsController);
    projectsService = moduleRef.get<ProjectsService>(ProjectsService);
  });

  describe("Projects", () => {
    describe("Create a project", () => {
      it("Should create a project", async () => {
        const createProjectDTO = new CreateProjectDto({
          name: "Lorem ipsum",
          color: "121212",
          description: "Lorem ipsum dolor sit amet"
        });
        jest.spyOn(projectsService, "createProject").mockImplementationOnce((userId: string, dto: CreateProjectDto) => {
          const project = new Project();
          project.name = dto.name;
          project.color = dto.color;
          project.description = dto.description;
          return Promise.resolve(project);
        });
        const project = await projectsController.createProject("user-id", createProjectDTO);
        expect(projectsService.createProject).toBeCalledWith("user-id", createProjectDTO);
        expect(project.name).toBe(createProjectDTO.name);
        expect(project.color).toBe(createProjectDTO.color);
        expect(project.description).toBe(createProjectDTO.description);
      });
    });

    describe("Get one project", () => {
      it("Should return a project if successful", async () => {
        const expectedResult: Project = {
          id: 1,
          name: "Lorem ipsum",
          color: "121212",
          description: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        jest.spyOn(projectsService, "getProject").mockImplementationOnce(() => Promise.resolve(expectedResult));
        expect(await projectsController.getProject("user-id", 1)).toBe(expectedResult);
      });

      it("Should throw a NotFoundException if the project does not exist", async (done) => {
        jest.spyOn(projectsRepository, "findOne").mockImplementationOnce(() => Promise.resolve(undefined));
        try {
          await projectsController.getProject("user-id", 1);
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          done();
        }
      });
    });

    describe("Delete", () => {
      it("Should delete a project", async () => {
        jest.spyOn(projectsService, "getProject").mockResolvedValueOnce(new Project());
        jest.spyOn(projectsRepository, "delete").mockImplementationOnce(() => Promise.resolve(new DeleteResult()));
        await projectsController.deleteProject("user-id", 1);
        expect(projectsRepository.delete).toBeCalled();
      });

      it("Should throw a NotFoundException if the project does not exist", async (done) => {
        jest.spyOn(projectsRepository, "findOne").mockImplementationOnce(() => Promise.resolve(undefined));
        try {
          await projectsController.deleteProject("user-id", 1);
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          done();
        }
      });
    });
  });

  describe("Languages", () => {
    const mockedProject: Project = {
      id: 123,
      name: "Lorem ipsum",
      color: "121212",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockedLanguage: Language = {
      id: 456,
      name: "FR",
      projectId: mockedProject.id,
      project: mockedProject,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    describe("Create", () => {
      it("Should create a language", async () => {
        const createDTO = new CreateLanguageDto({name: "FR"});
        jest.spyOn(projectsService, "getProject").mockResolvedValue(new Project());
        jest.spyOn(languagesRepository, "create").mockImplementationOnce(() => {
          return mockedLanguage;
        });
        jest.spyOn(languagesRepository, "save").mockResolvedValueOnce(mockedLanguage);
        jest.spyOn(projectsService, "getLanguage").mockResolvedValueOnce(mockedLanguage);
        const language = await projectsController.createLanguage("user-id", 1, createDTO);
        expect(languagesRepository.save).toBeCalled();
        expect(language.name).toBe(createDTO.name);
        expect(language.project.id).toBe(mockedProject.id);
      });
    });

    describe("Get one", () => {
      it("Should return a language if successful", async () => {
        jest.spyOn(projectsService, "getProject").mockResolvedValueOnce(mockedProject);
        jest.spyOn(languagesRepository, "findOne").mockResolvedValueOnce(mockedLanguage);
        expect(await projectsController.getLanguage("user-id", 123, 456)).toBe(mockedLanguage);
      });

      it("Should throw a NotFoundException if the project does not exist", async (done) => {
        jest.spyOn(projectsRepository, "findOne").mockResolvedValueOnce(undefined);
        try {
          await projectsController.getLanguage("user-id", 123, 456);
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          done();
        }
      });

      it("Should throw a NotFoundException if the language does not exist", async (done) => {
        jest.spyOn(projectsService, "getProject").mockResolvedValueOnce(mockedProject);
        jest.spyOn(languagesRepository, "findOne").mockResolvedValueOnce(undefined);
        try {
          await projectsController.getLanguage("user-id", 123, 456);
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          done();
        }
      });
    });

    describe("Delete language", () => {
      it("Should delete a language", async () => {
        jest.spyOn(projectsService, "getProject").mockResolvedValue(mockedProject);
        jest.spyOn(languagesRepository, "findOne").mockResolvedValueOnce(mockedLanguage);
        jest.spyOn(languagesRepository, "delete").mockResolvedValueOnce(new DeleteResult());
        await projectsController.deleteLanguage("user-id", 123, 456);
        expect(projectsService.getProject).toBeCalled();
        expect(languagesRepository.findOne).toBeCalledWith(456);
        expect(languagesRepository.delete).toBeCalledWith(456);
      });

      it("Should throw a NotFoundException if the project does not exist", async (done) => {
        jest.spyOn(projectsService, "getProject").mockResolvedValueOnce(mockedProject);
        jest.spyOn(languagesRepository, "findOne").mockResolvedValueOnce(undefined);
        try {
          await projectsController.deleteLanguage("user-id", 123, 456);
          expect(projectsRepository.findOne).toBeCalledWith(123);
          expect(languagesRepository.findOne).toBeCalledWith(456);
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          done();
        }
      });

      it("Should throw a NotFoundException if the language does not exist", async (done) => {
        jest.spyOn(projectsRepository, "findOne").mockResolvedValueOnce(undefined);
        try {
          await projectsController.deleteLanguage("user-id", 123, 456);
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          done();
        }
      });
    });
  });
});