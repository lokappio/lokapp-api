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
@Controller("projects/:project_id/translations")
export default class TranslationController {
  constructor(private readonly translationService: TranslationService) {
  }

  @Post()
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  public createKey(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number,
    @Body(new JoiValidationPipe(CreateKeyDto.schema)) createKeyDto: CreateKeyDto): Promise<TranslationKey> {
    return this.translationService.createTranslationKey(userId, projectId, createKeyDto);
  }

  @Get()
  public getKeys(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number): Promise<TranslationKey[]> {
    return this.translationService.getTranslationKeys(userId, projectId);
  }

  @Get(":translation_id")
  public getKey(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number,
    @Param("translation_id", ParseIntPipe) keyId: number): Promise<TranslationKey> {
    return this.translationService.getTranslationKey(userId, projectId, keyId);
  }

  @Delete(":translation_id")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  @HttpCode(204)
  public deleteKey(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number,
    @Param("translation_id", ParseIntPipe) keyId: number): Promise<void> {
    return this.translationService.deleteKey(userId, projectId, keyId);
  }

  @Patch(":translation_id")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  public updateKey(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number,
    @Param("translation_id", ParseIntPipe) keyId: number,
    @Body(new JoiValidationPipe(UpdateKeyDto.schema)) updateKeyDto: UpdateKeyDto): Promise<TranslationKey> {
    return this.translationService.updateKey(userId, projectId, keyId, updateKeyDto);
  }

  // Values
  @Post(":translation_id/values")
  @Roles(Role.Owner, Role.Manager, Role.Editor, Role.Translator)
  @ApiProperty({enum: QuantityString})
  public createValue(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number,
    @Param("translation_id", ParseIntPipe) translationId: number,
    @Body(new JoiValidationPipe(CreateValueDto.schema)) createValueDto: CreateValueDto): Promise<TranslationValue> {
    return this.translationService.createValue(userId, projectId, translationId, createValueDto);
  }

  @ApiImplicitQueries([
    {name: "language_id", required: false, type: Number}
  ])
  @Get(":translation_id/values")
  public getValues(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number,
    @Param("translation_id", ParseIntPipe) translationId: number,
    @Query() query: GetTranslationValueDto): Promise<TranslationValue[]> {
    if (query.language_id) {
      return this.translationService.getValuesWithLanguage(userId, projectId, translationId, query.language_id);
    }
    return this.translationService.getAllValues(userId, projectId, translationId);
  }

  @Patch(":translation_id/values/:value_id")
  @Roles(Role.Owner, Role.Manager, Role.Editor, Role.Translator)
  @ApiProperty({enum: QuantityString})
  public updateValue(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number,
    @Param("translation_id", ParseIntPipe) translationId: number,
    @Param("value_id", ParseIntPipe) valueId: number,
    @Body(new JoiValidationPipe(UpdateValueDto.schema)) updateValueDto: UpdateValueDto): Promise<TranslationValue> {
    return this.translationService.updateValue(userId, projectId, translationId, valueId, updateValueDto);
  }

  @Delete(":translation_id/values/:value_id")
  @Roles(Role.Owner, Role.Manager, Role.Editor, Role.Translator)
  @HttpCode(204)
  public deleteValue(
    @UserId() userId: string,
    @Param("project_id", ParseIntPipe) projectId: number,
    @Param("translation_id", ParseIntPipe) translationId: number,
    @Param("value_id", ParseIntPipe) valueId: number): Promise<void> {
    return this.translationService.deleteValue(userId, projectId, translationId, valueId);
  }
}