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

  @Get(":project_id")
  public getProject(@UserId() userId: string, @Param("project_id", ParseIntPipe) projectId: number): Promise<Project> {
    return this.projectsService.getProject(userId, projectId);
  }

  @Put(":project_id")
  @Roles(Role.Owner, Role.Manager)
  public updateProject(@UserId() userId: string, @Param("project_id", ParseIntPipe) projectId: number, @Body(new JoiValidationPipe(UpdateProjectDto.schema)) updateProjectDto: UpdateProjectDto): Promise<Project> {
    return this.projectsService.updateProject(userId, projectId, updateProjectDto);
  }

  @Delete(":project_id")
  @Roles(Role.Owner)
  @HttpCode(204)
  public deleteProject(@UserId() userId: string, @Param("project_id", ParseIntPipe) projectId: number): Promise<void> {
    return this.projectsService.deleteProject(userId, projectId);
  }

  @Get(":project_id/details")
  public getProjectDetails(@UserId() userId: string, @Param("project_id", ParseIntPipe) projectId: number): Promise<DetailedProject> {
    return this.projectsService.getWholeProjectDetails(userId, projectId);
  }

  @Post(":project_id/languages")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  public createLanguage(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number,
    @Body(new JoiValidationPipe(CreateLanguageDto.schema)) createLanguageDto: CreateLanguageDto): Promise<Language> {
    return this.projectsService.createLanguage(userId, projectId, createLanguageDto);
  }

  @Get(":project_id/languages")
  public getLanguages(@UserId() userId: string, @Param("project_id", ParseIntPipe) projectId: number): Promise<Language[]> {
    return this.projectsService.getAllLanguages(userId, projectId);
  }

  @Get(":project_id/languages/:language_id")
  public getLanguage(@UserId() userId: string, @Param("project_id", ParseIntPipe) projectId: number, @Param("language_id", ParseIntPipe) languageId: number): Promise<Language> {
    return this.projectsService.getLanguage(userId, projectId, languageId);
  }

  @Put(":project_id/languages/:language_id")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  public updateLanguage(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number,
    @Param("language_id", ParseIntPipe) languageId: number,
    @Body(new JoiValidationPipe(CreateLanguageDto.schema)) createLanguageDto: CreateLanguageDto): Promise<Language> {
    return this.projectsService.updateLanguage(userId, projectId, languageId, createLanguageDto);
  }

  @Delete(":project_id/languages/:language_id")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  @HttpCode(204)
  public deleteLanguage(@UserId() userId: string, @Param("project_id", ParseIntPipe) projectId: number, @Param("language_id", ParseIntPipe) languageId: number): Promise<void> {
    return this.projectsService.deleteLanguage(userId, projectId, languageId);
  }

  // Control users of projects
  @Get(":project_id/users")
  public getUsersOfProject(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number): Promise<ProjectUser[]> {
    return this.projectsService.getUsersOfProject(userId, projectId);
  }

  @Get(":project_id/users/me")
  public getMyselfOnProject(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number): Promise<ProjectUser> {
    return this.projectsService.getProjectUser(userId, projectId);
  }

  @Patch(":project_id/users/:target_user_id")
  @Roles(Role.Owner, Role.Manager)
  public updateRoleOfUser(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number,
    @Param("target_user_id") userIdToUpdate: string,
    @Body(new JoiValidationPipe(UpdateRoleDto.schema)) updateRoleDto: UpdateRoleDto): Promise<ProjectUser> {
    return this.projectsService.updateRoleOfUser(userId, projectId, userIdToUpdate, updateRoleDto);
  }

  @Delete(":project_id/users/:target_user_id")
  @Roles(Role.Owner, Role.Manager)
  @HttpCode(204)
  public removeUserFromProject(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number,
    @Param("target_user_id") userIdToUpdate: string): Promise<void> {
    return this.projectsService.removeUserFromProject(userId, projectId, userIdToUpdate);
  }

  @Post(":project_id/leave")
  public leaveProject(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number): Promise<void> {
    return this.projectsService.leaveProject(userId, projectId);
  }
}
