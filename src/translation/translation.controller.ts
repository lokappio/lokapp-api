import {Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {ApiBearerAuth, ApiProperty, ApiTags} from "@nestjs/swagger";
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
import QuantityString from "./quantity_string.enum";
import {Roles} from "../roles/role.decorator";
import Role from "../roles/role.enum";
import {RolesGuard} from "../roles/roles.guard";
import GetTranslationValueDto from "./dto/get-value.dto";

@ApiBearerAuth()
@ApiTags("Translation")
@UseGuards(JwtAuthUserGuard, RolesGuard)
@Controller("projects/:projectId/translations")
export default class TranslationController {
  constructor(private readonly translationService: TranslationService) {
  }

  @Post()
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  public createKey(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Body(new JoiValidationPipe(CreateKeyDto.schema)) createKeyDto: CreateKeyDto): Promise<TranslationKey> {
    return this.translationService.createTranslationKey(userId, projectId, createKeyDto);
  }

  @Get()
  public getKeys(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number): Promise<TranslationKey[]> {
    return this.translationService.getTranslationKeys(userId, projectId);
  }

  @Get("values")
  @ApiImplicitQueries([
    {name: "languageId", required: true, type: Number}
  ])
  public getAllTranslationValues(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Query() query: GetTranslationValueDto): Promise<TranslationValue[]> {
    return this.translationService.getAllTranslationValues(userId, projectId, query.languageId);
  }

  @Get(":translationId")
  public getKey(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("translationId", ParseIntPipe) keyId: number): Promise<TranslationKey> {
    return this.translationService.getTranslationKey(userId, projectId, keyId);
  }

  @Delete(":translationId")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  @HttpCode(204)
  public deleteKey(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("translationId", ParseIntPipe) keyId: number): Promise<void> {
    return this.translationService.deleteKey(userId, projectId, keyId);
  }

  @Patch(":translationId")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
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
  @ApiProperty({enum: QuantityString})
  public createValue(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("translationId", ParseIntPipe) translationId: number,
    @Body(new JoiValidationPipe(CreateValueDto.schema)) createValueDto: CreateValueDto): Promise<TranslationValue> {
    return this.translationService.createValue(userId, projectId, translationId, createValueDto);
  }

  @ApiImplicitQueries([
    {name: "languageId", required: false, type: Number}
  ])
  @Get(":translationId/values")
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
  @ApiProperty({enum: QuantityString})
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
  @HttpCode(204)
  public deleteValue(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("translationId", ParseIntPipe) translationId: number,
    @Param("valueId", ParseIntPipe) valueId: number): Promise<void> {
    return this.translationService.deleteValue(userId, projectId, translationId, valueId);
  }
}