import {Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, UseGuards} from "@nestjs/common";
import {ApiBearerAuth, ApiTags} from "@nestjs/swagger";
import CreateProjectDto from "./dto/create-project.dto";
import ProjectsService from "./projects.service";
import Project from "./project.entity";
import {JoiValidationPipe} from "../common/joi-validation.pipe";
import CreateLanguageDto from "./dto/create-language.dto";
import Language from "../languages/language.entity";
import {JwtAuthUserGuard} from "../auth/guards/jwt-auth-user.guard";
import {UserId} from "../users/user-id.decorator";
import UpdateProjectDto from "./dto/update-project.dto";
import Role from "../roles/role.enum";
import {Roles} from "../roles/role.decorator";
import {RolesGuard} from "../roles/roles.guard";
import ProjectUser from "./model/project-user.model";
import UpdateRoleDto from "./dto/update-role.dto";
import DetailedProject from "./detailed-model/detailed-project.model";
import TranslationValue from "../translation/translation_value.entity";

@ApiBearerAuth()
@ApiTags("Projects")
@UseGuards(JwtAuthUserGuard, RolesGuard)
@Controller("projects")
export default class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService) {
  }

  @Post()
  public createProject(@UserId() userId: string, @Body(new JoiValidationPipe(CreateProjectDto.schema)) createProjectDto: CreateProjectDto): Promise<Project> {
    return this.projectsService.createProject(userId, createProjectDto);
  }

  @Get()
  public getProjects(@UserId() userId: string): Promise<Project[]> {
    return this.projectsService.getUserProjects(userId);
  }

  @Get(":projectId")
  public getProject(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number): Promise<Project> {
    return this.projectsService.getProject(userId, projectId);
  }

  @Put(":projectId")
  @Roles(Role.Owner, Role.Manager)
  public updateProject(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number, @Body(new JoiValidationPipe(UpdateProjectDto.schema)) updateProjectDto: UpdateProjectDto): Promise<Project> {
    return this.projectsService.updateProject(userId, projectId, updateProjectDto);
  }

  @Delete(":projectId")
  @Roles(Role.Owner)
  @HttpCode(204)
  public deleteProject(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number): Promise<void> {
    return this.projectsService.deleteProject(userId, projectId);
  }

  @Get(":projectId/details")
  public getProjectDetails(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number): Promise<DetailedProject> {
    return this.projectsService.getWholeProjectDetails(userId, projectId);
  }

  @Post(":projectId/languages")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  public createLanguage(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Body(new JoiValidationPipe(CreateLanguageDto.schema)) createLanguageDto: CreateLanguageDto): Promise<{language: Language, values: TranslationValue[]}> {
    return this.projectsService.createLanguage(userId, projectId, createLanguageDto);
  }

  @Get(":projectId/languages")
  public getLanguages(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number): Promise<Language[]> {
    return this.projectsService.getAllLanguages(userId, projectId);
  }

  @Get(":projectId/languages/:languageId")
  public getLanguage(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number, @Param("languageId", ParseIntPipe) languageId: number): Promise<Language> {
    return this.projectsService.getLanguage(userId, projectId, languageId);
  }

  @Put(":projectId/languages/:languageId")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  public updateLanguage(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("languageId", ParseIntPipe) languageId: number,
    @Body(new JoiValidationPipe(CreateLanguageDto.schema)) createLanguageDto: CreateLanguageDto): Promise<Language> {
    return this.projectsService.updateLanguage(userId, projectId, languageId, createLanguageDto);
  }

  @Delete(":projectId/languages/:languageId")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  @HttpCode(204)
  public deleteLanguage(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number, @Param("languageId", ParseIntPipe) languageId: number): Promise<void> {
    return this.projectsService.deleteLanguage(userId, projectId, languageId);
  }

  // Control users of projects
  @Get(":projectId/users")
  public getUsersOfProject(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number): Promise<ProjectUser[]> {
    return this.projectsService.getUsersOfProject(userId, projectId);
  }

  @Get(":projectId/users/me")
  public getMyselfOnProject(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number): Promise<ProjectUser> {
    return this.projectsService.getProjectUser(userId, projectId);
  }

  @Patch(":projectId/users/:targetUserId")
  @Roles(Role.Owner, Role.Manager)
  public updateRoleOfUser(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("targetUserId") userIdToUpdate: string,
    @Body(new JoiValidationPipe(UpdateRoleDto.schema)) updateRoleDto: UpdateRoleDto): Promise<ProjectUser> {
    return this.projectsService.updateRoleOfUser(userId, projectId, userIdToUpdate, updateRoleDto);
  }

  @Delete(":projectId/users/:targetUserId")
  @Roles(Role.Owner, Role.Manager)
  @HttpCode(204)
  public removeUserFromProject(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("targetUserId") userIdToUpdate: string): Promise<void> {
    return this.projectsService.removeUserFromProject(userId, projectId, userIdToUpdate);
  }

  @Post(":projectId/leave")
  public leaveProject(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number): Promise<void> {
    return this.projectsService.leaveProject(userId, projectId);
  }
}
