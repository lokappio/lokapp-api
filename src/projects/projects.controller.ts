import {Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, UseGuards} from "@nestjs/common";
import {ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse} from "@nestjs/swagger";
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
@ApiUnauthorizedResponse({description: "Unauthorized"})
export default class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService) {
  }

  @Post()
  @ApiOperation({summary: "Create a new project"})
  @ApiCreatedResponse({type: Project})
  public createProject(@UserId() userId: string, @Body(new JoiValidationPipe(CreateProjectDto.schema)) createProjectDto: CreateProjectDto): Promise<Project> {
    return this.projectsService.createProject(userId, createProjectDto);
  }

  @Get()
  @ApiOperation({summary: "Get the list of projects the authenticated user belongs to"})
  @ApiOkResponse({type: [Project]})
  public getProjects(@UserId() userId: string): Promise<Project[]> {
    return this.projectsService.getUserProjects(userId);
  }

  @Get(":projectId")
  @ApiOperation({summary: "Get a specific project the authenticated user has access to"})
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiOkResponse({type: Project})
  public getProject(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number): Promise<Project> {
    return this.projectsService.getProject(userId, projectId);
  }

  @Put(":projectId")
  @Roles(Role.Owner, Role.Manager)
  @ApiOperation({summary: "Edit a project"})
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiOkResponse({type: Project})
  public updateProject(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number, @Body(new JoiValidationPipe(UpdateProjectDto.schema)) updateProjectDto: UpdateProjectDto): Promise<Project> {
    return this.projectsService.updateProject(userId, projectId, updateProjectDto);
  }

  @Delete(":projectId")
  @Roles(Role.Owner)
  @ApiOperation({summary: "Delete a project"})
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiNoContentResponse({description: "NoContent"})
  @HttpCode(204)
  public deleteProject(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number): Promise<void> {
    return this.projectsService.deleteProject(userId, projectId);
  }

  @Get(":projectId/details")
  @ApiOperation({
    summary: "Get the whole project content",
    description: "This return whole content of a project (project's details, groups, translation keys, translation values"
  })
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiOkResponse({type: DetailedProject})
  public getProjectDetails(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number): Promise<DetailedProject> {
    return this.projectsService.getWholeProjectDetails(userId, projectId);
  }

  @Post(":projectId/languages")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  @ApiOperation({summary: "Add a new language to the project"})
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiCreatedResponse({type: Language})
  public createLanguage(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Body(new JoiValidationPipe(CreateLanguageDto.schema)) createLanguageDto: CreateLanguageDto): Promise<Language> {
    return this.projectsService.createLanguage(userId, projectId, createLanguageDto);
  }

  @Get(":projectId/languages")
  @ApiOperation({summary: "Get the list of languages available for the project"})
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiOkResponse({type: [Language]})
  public getLanguages(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number): Promise<Language[]> {
    return this.projectsService.getAllLanguages(userId, projectId);
  }

  @Get(":projectId/languages/:languageId")
  @ApiOperation({summary: "Get the specified language"})
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiOkResponse({type: Language})
  public getLanguage(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number, @Param("languageId", ParseIntPipe) languageId: number): Promise<Language> {
    return this.projectsService.getLanguage(userId, projectId, languageId);
  }

  @Put(":projectId/languages/:languageId")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  @ApiOperation({summary: "Edit a language"})
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiOkResponse({type: Language})
  public updateLanguage(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("languageId", ParseIntPipe) languageId: number,
    @Body(new JoiValidationPipe(CreateLanguageDto.schema)) createLanguageDto: CreateLanguageDto): Promise<Language> {
    return this.projectsService.updateLanguage(userId, projectId, languageId, createLanguageDto);
  }

  @Delete(":projectId/languages/:languageId")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  @ApiOperation({summary: "Delete a language"})
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiNoContentResponse({description: "NoContent"})
  @HttpCode(204)
  public deleteLanguage(@UserId() userId: string, @Param("projectId", ParseIntPipe) projectId: number, @Param("languageId", ParseIntPipe) languageId: number): Promise<void> {
    return this.projectsService.deleteLanguage(userId, projectId, languageId);
  }

  // Project's users

  @Get(":projectId/users")
  @ApiOperation({summary: "Get the list of users who have access to the project in addition of the pending invitations"})
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiOkResponse({type: [ProjectUser]})
  public getUsersOfProject(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number): Promise<ProjectUser[]> {
    return this.projectsService.getUsersOfProject(userId, projectId);
  }

  @Get(":projectId/users/me")
  @ApiOperation({summary: "Get the information of the authenticated user within the project (i.e. role)"})
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiOkResponse({type: ProjectUser})
  public getCurrentUserOnProject(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number): Promise<ProjectUser> {
    return this.projectsService.getProjectUser(userId, projectId);
  }

  @Patch(":projectId/users/:targetUserId")
  @Roles(Role.Owner, Role.Manager)
  @ApiOperation({summary: "Edit a user's role within the project"})
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiOkResponse({type: ProjectUser})
  public updateRoleOfUser(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("targetUserId") userIdToUpdate: string,
    @Body(new JoiValidationPipe(UpdateRoleDto.schema)) updateRoleDto: UpdateRoleDto): Promise<ProjectUser> {
    return this.projectsService.updateRoleOfUser(userId, projectId, userIdToUpdate, updateRoleDto);
  }

  @Delete(":projectId/users/:targetUserId")
  @Roles(Role.Owner, Role.Manager)
  @ApiOperation({summary: "Remove a user from the project"})
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiNoContentResponse({description: "NoContent"})
  @HttpCode(204)
  public removeUserFromProject(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("targetUserId") userIdToUpdate: string): Promise<void> {
    return this.projectsService.removeUserFromProject(userId, projectId, userIdToUpdate);
  }

  @Post(":projectId/leave")
  @ApiOperation({summary: "Leave project"})
  @ApiForbiddenResponse({description: "Forbidden"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiNoContentResponse({description: "NoContent"})
  @HttpCode(204)
  public leaveProject(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number): Promise<void> {
    return this.projectsService.leaveProject(userId, projectId);
  }
}
