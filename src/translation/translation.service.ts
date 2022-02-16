import {Injectable, NotFoundException, UnprocessableEntityException} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {QueryFailedErrorType} from "../common/query-error.filter";
import ProjectsService from "../projects/projects.service";
import {getManager, Not, Repository} from "typeorm";
import CreateKeyDto from "./dto/create-key.dto";
import TranslationKey from "./translation_key.entity";
import TranslationValue from "./translation_value.entity";
import CreateValueDto from "./dto/create-value.dto";
import UpdateValueDto from "./dto/update-value.dto";
import UpdateKeyDto from "./dto/update-key.dto";
import GroupService from "../groups/group.service";
import QuantityString from "./quantity_string.enum";

@Injectable()
export default class TranslationService {
  constructor(
    @InjectRepository(TranslationKey)
    private readonly translationKeyRepository: Repository<TranslationKey>,
    @InjectRepository(TranslationValue)
    private readonly translationValueRepository: Repository<TranslationValue>,
    private readonly projectsService: ProjectsService,
    private readonly groupsService: GroupService
  ) {
  }

  private async translationKeyAlreadyExists(keyName: string, projectId: number, groupId: number): Promise<boolean> {
    const sameKeys = await this.translationKeyRepository.find({
      where: {
        name: keyName,
        project: {
          id: projectId
        },
        group_id: groupId
      }
    });
    return sameKeys.length > 0;
  }

  private async findDuplicatedKeys(translationKeyId: number, keyName: string, projectId: number, groupId: number): Promise<TranslationKey[]> {
    return await this.translationKeyRepository.find({
      where: {
        id: Not(translationKeyId),
        name: keyName,
        project: {
          id: projectId
        },
        group_id: groupId
      }
    });
  }

  public async createTranslationKey(userId: string, projectId: number, createKeyDto: CreateKeyDto): Promise<TranslationKey> {
    // Check if project and group exist
    const project = await this.projectsService.getProject(userId, projectId);
    const group = await this.groupsService.getGroup(userId, projectId, createKeyDto.group_id);

    // Check if the translation key already exists
    const keyAlreadyExists = await this.translationKeyAlreadyExists(createKeyDto.name, projectId, createKeyDto.group_id);
    if (keyAlreadyExists) {
      throw new UnprocessableEntityException(QueryFailedErrorType.KEY_ALREADY_EXISTS);
    }

    // Create the new translation key
    const key = new TranslationKey();
    key.name = createKeyDto.name;
    key.project = project;
    key.is_plural = createKeyDto.is_plural;
    key.group = group;

    return await this.translationKeyRepository.save(key);
  }

  public async getTranslationKey(userId: string, projectId: number, keyId: number): Promise<TranslationKey> {
    const project = await this.projectsService.getProject(userId, projectId);
    const key: TranslationKey = await this.translationKeyRepository.findOne(keyId);
    if (!key || key.projectId != project.id) {
      throw new NotFoundException();
    }
    return key;
  }

  public async getTranslationKeys(userId: string, projectId: number): Promise<TranslationKey[]> {
    // Check the project exists and the user's access
    const project = await this.projectsService.getProject(userId, projectId);
    // Then find all translation keys of the project
    return this.translationKeyRepository.find({
      where: {
        project: {
          id: project.id
        }
      }
    });
  }

  public async deleteKey(userId: string, projectId: number, keyId: number): Promise<void> {
    // Check the translation key exists
    const key = await this.getTranslationKey(userId, projectId, keyId);
    // Then delete it
    await this.translationKeyRepository.delete(key.id);
  }

  public async updateKey(userId: string, projectId: number, keyId: number, updateKeyDto: UpdateKeyDto): Promise<TranslationKey> {
    // Get the translation key to update
    const key = await this.getTranslationKey(userId, projectId, keyId);

    // Updating the name
    if (updateKeyDto.name !== undefined) {
      // Check if a key already exists in the group
      const duplicatedKeys = await this.findDuplicatedKeys(keyId, updateKeyDto.name, projectId, key.group_id);
      if (duplicatedKeys.length > 0) {
        throw new UnprocessableEntityException(QueryFailedErrorType.KEY_ALREADY_EXISTS);
      }
      key.name = updateKeyDto.name;
    }

    // Updating the group
    if (updateKeyDto.group_id !== undefined) {
      // Check if the group already exists in project
      const group = await this.groupsService.getGroup(userId, projectId, updateKeyDto.group_id);
      if (!group) {
        throw new NotFoundException();
      }
      // Check there isn't any key with the same name in the targeted group
      const duplicatedKeys = await this.findDuplicatedKeys(keyId, key.name, projectId, updateKeyDto.group_id);
      if (duplicatedKeys.length > 0) {
        throw new UnprocessableEntityException(QueryFailedErrorType.KEY_ALREADY_EXISTS);
      }
      key.group = group;
    }

    // Updating the isPlural boolean
    if (updateKeyDto.is_plural !== undefined && updateKeyDto.is_plural !== key.is_plural) {
      // Transforming the singular key into a plural one
      if (updateKeyDto.is_plural) {
        key.is_plural = true;

        // Search for a translation value
        const singularValue = await this.translationValueRepository.findOne({
          where: {
            key: key
          }
        });

        // In case there is a value for this key, update its quantity_string from `null` to `OTHER`.
        // And create ONE and ZERO values
        if (singularValue != undefined) {
          singularValue.quantity_string = QuantityString.OTHER;
          for (const quantity of [QuantityString.ONE, QuantityString.ZERO]) {
            const quantityValue = new TranslationValue();
            quantityValue.key = key;
            quantityValue.language_id = singularValue.language_id;
            quantityValue.quantity_string = quantity;
            quantityValue.name = singularValue.name;
            await this.translationValueRepository.save(quantityValue);
          }
        }
      } else { // Transforming the plural key into a singular one
        key.is_plural = false;

        // Find the translation values if they exist
        const values = await this.translationValueRepository.find({
          where: {
            key_id: key.id
          }
        });

        // Delete ONE and ZERO values and keep the OTHER one as the singular value
        for (const value of values) {
          if (value.quantity_string == QuantityString.ONE || value.quantity_string == QuantityString.ZERO) {
            await this.translationValueRepository.delete(value.id);
          } else if (value.quantity_string == QuantityString.OTHER) {
            value.quantity_string = null;
            await this.translationValueRepository.save(value);
          }
        }
      }
    }
    return await this.translationKeyRepository.save(key);
  }

  private async translationValuesAlreadyExists(translationKeyId: number, languageId: number, quantityString: string | null) {
    const sameValues = await this.translationValueRepository.find({
      where: {
        key: {
          id: translationKeyId
        },
        language: {
          id: languageId
        },
        quantity_string: quantityString
      }
    });
    return sameValues.length > 0;
  }

  public async createValue(userId: string, projectId: number, translationKeyId: number, createValueDto: CreateValueDto): Promise<TranslationValue> {
    const language = await this.projectsService.getLanguage(userId, projectId, createValueDto.language_id);
    const key = await this.getTranslationKey(userId, projectId, translationKeyId);

    // If no quantityString provided, assume it should be null.
    const quantityString = createValueDto.quantity_string == undefined ? null : createValueDto.quantity_string;

    // Check if value already exists for this language and quantity
    const valueExists = await this.translationValuesAlreadyExists(translationKeyId, language.id, quantityString);
    if (valueExists) {
      throw new UnprocessableEntityException(QueryFailedErrorType.VALUE_ALREADY_EXISTS);
    }

    // Check quantity is correct
    if (key.is_plural == false && quantityString !== null) {
      // Quantity should be null for a singular translation key
      throw new UnprocessableEntityException(QueryFailedErrorType.QUANTITY_STRING_NOT_VALID);
    } else if (key.is_plural == true && quantityString === null) {
      // Quantity shouldn't be null for plural key
      throw new UnprocessableEntityException(QueryFailedErrorType.QUANTITY_STRING_NOT_VALID);
    }

    // Create a new translation value
    const value = new TranslationValue();
    value.key = key;
    value.language = language;
    value.name = createValueDto.name;
    value.quantity_string = quantityString;
    return await this.translationValueRepository.save(value);
  }

  public async getAllValues(userId: string, projectId: number, translationKeyId: number): Promise<TranslationValue[]> {
    const key = await this.getTranslationKey(userId, projectId, translationKeyId);
    return this.translationValueRepository.find({
      where: {
        key: {
          id: key.id
        }
      }
    });
  }

  public async updateValue(
    userId: string,
    projectId: number,
    translationKeyId: number,
    valueId: number,
    updateValueDto: UpdateValueDto
  ): Promise<TranslationValue> {
    const value = await this.getValue(userId, projectId, translationKeyId, valueId);
    value.name = updateValueDto.name;
    return await this.translationValueRepository.save(value);
  }

  public async deleteValue(
    userId: string,
    projectId: number,
    translationId: number,
    valueId: number
  ): Promise<void> {
    const value = await this.getValue(userId, projectId, translationId, valueId);
    await this.translationValueRepository.delete(value.id);
  }

  public async getValuesWithLanguage(
    userId: string,
    projectId: number,
    translationKeyId: number,
    languageId: number
  ): Promise<TranslationValue[]> {
    const key = await this.getTranslationKey(userId, projectId, translationKeyId);
    const language = await this.projectsService.getLanguage(userId, projectId, languageId);
    return this.translationValueRepository.find({
      where: {
        key_id: key.id,
        language_id: language.id
      }
    });
  }

  public async getEveryValuesOfProject(userId: string, projectId: number): Promise<any[]> {
    const project = await this.projectsService.getProject(userId, projectId);
    return await getManager()
      .createQueryBuilder()
      .select(["t_keys.id AS key_id", "t_keys.name AS key_name", "t_keys.is_plural AS is_plural", "t_values.id AS value_id", "t_values.name AS value_name", "t_values.quantity_string AS quantity", "lang.id AS language_id", "lang.name AS language_name", "group.id AS group_id", "group.name AS group_name"])
      .from("translation_keys", "t_keys")
      .leftJoin("project_languages", "lang", "t_keys.project_id = lang.project_id")
      .leftJoin("translation_values", "t_values", "t_keys.id = t_values.key_id AND t_values.language_id = lang.id")
      .leftJoin("groups", "group", "t_keys.project_id = group.project_id AND t_keys.group_id = group.id")
      .where("t_keys.project_id = :project_id")
      .setParameters({project_id: project.id})
      .orderBy("t_keys.id, lang.id")
      .getRawMany();
  }

  public async getValue(userId: string, projectId: number, translationKeyId: number, valueId: number): Promise<TranslationValue> {
    const key = await this.getTranslationKey(userId, projectId, translationKeyId);
    const value = await this.translationValueRepository.findOne(valueId);
    if (!value || value.key_id !== key.id) {
      throw new NotFoundException();
    }
    return value;
  }
}