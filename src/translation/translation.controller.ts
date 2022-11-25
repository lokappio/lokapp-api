import {Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse, ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse
} from "@nestjs/swagger";
import {ApiImplicitQueries} from "nestjs-swagger-api-implicit-queries-decorator";
import {JwtAuthUserGuard} from "../auth/guards/jwt-auth-user.guard";
import {JoiValidationPipe} from "../common/joi-validation.pipe";
import {UserId} from "../users/user-id.decorator";
import CreateKeyDto from "./dto/create-key.dto";
import UpdateKeyDto from "./dto/update-key.dto";
import CreateValueDto from "./dto/create-value.dto";
import UpdateValueDto from "./dto/update-value.dto";
import TranslationService from "./translation.service";
import TranslationKey from "./translation_key.entity";
import TranslationValue from "./translation_value.entity";
import {Roles} from "../roles/role.decorator";
import Role from "../roles/role.enum";
import {RolesGuard} from "../roles/roles.guard";
import GetTranslationValueDto from "./dto/get-value.dto";

@ApiBearerAuth()
@ApiTags("Translation")
@UseGuards(JwtAuthUserGuard, RolesGuard)
@Controller("projects/:projectId/translations")
@ApiUnauthorizedResponse({description: "Unauthorized"})
@ApiForbiddenResponse({description: "Forbidden"})
@ApiNotFoundResponse({description: "NotFound"})
export default class TranslationController {
  constructor(private readonly translationService: TranslationService) {
  }

  @Post()
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  @ApiOperation({summary: "Create a new translation key"})
  @ApiBadRequestResponse({description: "BadRequest"})
  @ApiUnprocessableEntityResponse({description: "Unprocessable"})
  @ApiCreatedResponse({type: TranslationKey})
  public createKey(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Body(new JoiValidationPipe(CreateKeyDto.schema)) createKeyDto: CreateKeyDto): Promise<TranslationKey> {
    return this.translationService.createTranslationKey(userId, projectId, createKeyDto);
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
    return this.translationService.createTranslationKeys(userId, projectId, createKeysDto);
  }

  @Get()
  @ApiOperation({summary: "Get the list of translation keys within the project"})
  @ApiOkResponse({type: [TranslationKey]})
  public getKeys(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number): Promise<TranslationKey[]> {
    return this.translationService.getTranslationKeys(userId, projectId);
  }

  @Get("values")
  @ApiOperation({summary: "Get all translation values of the specified language"})
  @ApiImplicitQueries([
    {name: "languageId", required: true, type: Number}
  ])
  @ApiOkResponse({type: [TranslationValue]})
  public getAllTranslationValues(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Query() query: GetTranslationValueDto): Promise<TranslationValue[]> {
    return this.translationService.getAllTranslationValues(userId, projectId, query.languageId);
  }

  @Get(":translationId")
  @ApiOperation({summary: "Get a specific translation key"})
  @ApiOkResponse({type: TranslationKey})
  public getKey(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("translationId", ParseIntPipe) keyId: number): Promise<TranslationKey> {
    return this.translationService.getTranslationKey(userId, projectId, keyId);
  }

  @Delete(":translationId")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  @ApiOperation({
    summary: "Remove a translation key",
    description: "Remove a translation key and all the translation values associated to this key"
  })
  @ApiNoContentResponse({description: "NoContent"})
  @HttpCode(204)
  public deleteKey(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("translationId", ParseIntPipe) keyId: number): Promise<void> {
    return this.translationService.deleteKey(userId, projectId, keyId);
  }

  @Patch(":translationId")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  @ApiOperation({summary: "Edit a translation key"})
  @ApiUnprocessableEntityResponse({description: "Unprocessable"})
  @ApiOkResponse({type: TranslationKey})
  public updateKey(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("translationId", ParseIntPipe) keyId: number,
    @Body(new JoiValidationPipe(UpdateKeyDto.schema)) updateKeyDto: UpdateKeyDto): Promise<TranslationKey> {
    return this.translationService.updateKey(userId, projectId, keyId, updateKeyDto);
  }

  // Values

  @Post(":translationId/values")
  @Roles(Role.Owner, Role.Manager, Role.Editor, Role.Translator)
  @ApiOperation({summary: "Create a new translation value"})
  @ApiUnprocessableEntityResponse({description: "Unprocessable"})
  @ApiOkResponse({type: TranslationValue})
  public createValue(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("translationId", ParseIntPipe) translationId: number,
    @Body(new JoiValidationPipe(CreateValueDto.schema)) createValueDto: CreateValueDto): Promise<TranslationValue> {
    return this.translationService.createValue(userId, projectId, translationId, createValueDto);
  }

  @Get(":translationId/values")
  @ApiOperation({summary: "Get all translation values of the translation key"})
  @ApiImplicitQueries([
    {name: "languageId", required: false, type: Number}
  ])
  @ApiOkResponse({type: [TranslationValue]})
  public getValues(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("translationId", ParseIntPipe) translationId: number,
    @Query() query: GetTranslationValueDto): Promise<TranslationValue[]> {
    if (query.languageId) {
      return this.translationService.getValuesOfLanguage(userId, projectId, translationId, query.languageId);
    }
    return this.translationService.getAllValues(userId, projectId, translationId);
  }

  @Patch(":translationId/values/:valueId")
  @Roles(Role.Owner, Role.Manager, Role.Editor, Role.Translator)
  @ApiOperation({summary: "Edit a translation value"})
  @ApiOkResponse({type: TranslationValue})
  public updateValue(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("translationId", ParseIntPipe) translationId: number,
    @Param("valueId", ParseIntPipe) valueId: number,
    @Body(new JoiValidationPipe(UpdateValueDto.schema)) updateValueDto: UpdateValueDto): Promise<TranslationValue> {
    return this.translationService.updateValue(userId, projectId, translationId, valueId, updateValueDto);
  }

  @Delete(":translationId/values/:valueId")
  @Roles(Role.Owner, Role.Manager, Role.Editor, Role.Translator)
  @ApiOperation({summary: "Remove a translation value"})
  @ApiNoContentResponse({description: "NoContent"})
  @HttpCode(204)
  public deleteValue(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("translationId", ParseIntPipe) translationId: number,
    @Param("valueId", ParseIntPipe) valueId: number): Promise<void> {
    return this.translationService.deleteValue(userId, projectId, translationId, valueId);
  }
}
