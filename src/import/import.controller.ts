import {Body, Controller, Param, ParseIntPipe, Post, UseGuards} from "@nestjs/common";
import {ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse} from "@nestjs/swagger";
import {JoiValidationPipe} from "../common/joi-validation.pipe";
import {JwtAuthUserGuard} from "../auth/guards/jwt-auth-user.guard";
import {UserId} from "../users/user-id.decorator";
import {RolesGuard} from "../roles/roles.guard";
import Role from "src/roles/role.enum";
import CreateProjectDto from "src/projects/dto/create-project.dto";
import Project from "src/projects/project.entity";
import { Roles } from "src/roles/role.decorator";
import TranslationKey from "src/translation/translation_key.entity";
import CreateKeyDto from "src/translation/dto/create-key.dto";
import ImportService from "./import.service";

@ApiBearerAuth()
@ApiTags("Import")
@UseGuards(JwtAuthUserGuard, RolesGuard)
@Controller("import")
@ApiUnauthorizedResponse({description: "Unauthorized"})
export default class ImportController {
  constructor(
    private readonly importService: ImportService,
  ) {}

  @Post("/project")
  @ApiOperation({summary: "Import a new project"})
  @ApiCreatedResponse({type: Project})
  public createProject(@UserId() userId: string, @Body(new JoiValidationPipe(CreateProjectDto.schema)) createProjectDto: CreateProjectDto): Promise<Project> {
    return this.importService.createProject(userId, createProjectDto);
  }

  @Post("/keys")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  @ApiOperation({summary: "Create new translation keys"})
  @ApiBadRequestResponse({description: "BadRequest"})
  @ApiUnprocessableEntityResponse({description: "Unprocessable"})
  @ApiCreatedResponse({type: [TranslationKey] })
  public createKeys(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Body(new JoiValidationPipe(CreateKeyDto.arraySchema)) createKeysDto: CreateKeyDto[]): Promise<TranslationKey[]> {
    return this.importService.createKeys(userId, projectId, createKeysDto);
  }
}
