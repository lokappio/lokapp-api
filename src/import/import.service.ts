import {Injectable} from "@nestjs/common";
import CreateProjectDto from "src/projects/dto/create-project.dto";
import Project from "src/projects/project.entity";
import CreateKeyDto from "src/translation/dto/create-key.dto";
import TranslationService from "src/translation/translation.service";
import TranslationKey from "src/translation/translation_key.entity";
import ProjectsService from "../projects/projects.service";

@Injectable()
export default class ImportService {
  constructor(
    private projectService: ProjectsService,
    private translationService: TranslationService,
  ) {}

  public async createProject(userId: string, createProjectDto: CreateProjectDto): Promise<Project> {
    const createdProject = await this.projectService.createProject(userId, createProjectDto);

    if (createProjectDto.keys) {
      await this.translationService.createTranslationKeys(userId, createdProject.id, createProjectDto.keys);
    }

    return createdProject;
  }

  public async createKeys(userId: string, projectId: number, createKeysDto: CreateKeyDto[]): Promise<TranslationKey[]> {
    return this.translationService.createTranslationKeys(userId, projectId, createKeysDto);
  }
}
