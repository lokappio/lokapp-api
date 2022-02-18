import {BadRequestException, Injectable, NotFoundException, UnprocessableEntityException} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {QueryFailedErrorType} from "../common/query-error.filter";
import ProjectsService from "../projects/projects.service";
import {Not, Repository} from "typeorm";
import CreateKeyDto from "./dto/create-key.dto";
import TranslationKey from "./translation_key.entity";
import TranslationValue from "./translation_value.entity";
import CreateValueDto from "./dto/create-value.dto";
import UpdateValueDto from "./dto/update-value.dto";
import UpdateKeyDto from "./dto/update-key.dto";
import GroupService from "../groups/group.service";
import QuantityString from "./quantity_string.enum";
import Group from "../groups/group.entity";
import CreateGroupDto from "../groups/dto/create-group.dto";

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
        groupId: groupId
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
        groupId: groupId
      }
    });
  }

  public async createTranslationKey(userId: string, projectId: number, createKeyDto: CreateKeyDto): Promise<TranslationKey> {
    // Check if project exists
    const project = await this.projectsService.getProject(userId, projectId);

    // Check DTO as groupId or groupName
    if (createKeyDto.groupId == null && createKeyDto.groupName == null) {
      throw new BadRequestException(null, "Must have a groupId or a groupName");
    }

    // Find or create the group
    let group: Group;
    if (createKeyDto.groupId != null) {
      group = await this.groupsService.getGroup(userId, projectId, createKeyDto.groupId);
    } else if (createKeyDto.groupName != null) {
      group = await this.groupsService.findOrCreateGroup(userId, projectId, new CreateGroupDto({name: createKeyDto.groupName}));
    }

    // Check if the translation key already exists
    const keyAlreadyExists = await this.translationKeyAlreadyExists(createKeyDto.name, projectId, createKeyDto.groupId);
    if (keyAlreadyExists) {
      throw new UnprocessableEntityException(QueryFailedErrorType.KEY_ALREADY_EXISTS);
    }

    // Create the new translation key
    const key = new TranslationKey();
    key.name = createKeyDto.name;
    key.project = project;
    key.isPlural = createKeyDto.isPlural;
    key.group = group;
    const createdKey = await this.translationKeyRepository.save(key);

    // Create all default values for this key
    const languages = await this.projectsService.getAllLanguages(userId, projectId);
    for (const language of languages) {
      if (key.isPlural) {
        // For plural key, create all 3 values by default
        await Promise.all(
          Object.values(QuantityString).map(async (quantity) => {
            return this.createValue(userId, projectId, createdKey.id, new CreateValueDto({name: "", languageId: language.id, quantityString: quantity}));
          })
        );
      } else {
        // For singular key, create a default value with an empty name
        await this.createValue(userId, projectId, createdKey.id, new CreateValueDto({name: "", languageId: language.id, quantityString: null}));
      }
    }

    return createdKey;
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
      const duplicatedKeys = await this.findDuplicatedKeys(keyId, updateKeyDto.name, projectId, key.groupId);
      if (duplicatedKeys.length > 0) {
        throw new UnprocessableEntityException(QueryFailedErrorType.KEY_ALREADY_EXISTS);
      }
      key.name = updateKeyDto.name;
    }

    // Updating the group
    if (updateKeyDto.groupId !== undefined) {
      // Check if the group already exists in project
      const group = await this.groupsService.getGroup(userId, projectId, updateKeyDto.groupId);
      if (!group) {
        throw new NotFoundException();
      }
      // Check there isn't any key with the same name in the targeted group
      const duplicatedKeys = await this.findDuplicatedKeys(keyId, key.name, projectId, updateKeyDto.groupId);
      if (duplicatedKeys.length > 0) {
        throw new UnprocessableEntityException(QueryFailedErrorType.KEY_ALREADY_EXISTS);
      }
      key.group = group;
    }

    // Updating the isPlural boolean
    if (updateKeyDto.isPlural !== undefined && updateKeyDto.isPlural !== key.isPlural) {
      // Transforming the singular key into a plural one
      if (updateKeyDto.isPlural) {
        key.isPlural = true;

        // Search for a translation value
        const singularValue = await this.translationValueRepository.findOne({
          where: {
            key: key
          }
        });

        // In case there is a value for this key, update its quantityString from `null` to `OTHER`.
        // And create ONE and ZERO values
        if (singularValue != undefined) {
          singularValue.quantityString = QuantityString.OTHER;
          for (const quantity of [QuantityString.ONE, QuantityString.ZERO]) {
            const quantityValue = new TranslationValue();
            quantityValue.key = key;
            quantityValue.languageId = singularValue.languageId;
            quantityValue.quantityString = quantity;
            quantityValue.name = singularValue.name;
            await this.translationValueRepository.save(quantityValue);
          }
        }
      } else { // Transforming the plural key into a singular one
        key.isPlural = false;

        // Find the translation values if they exist
        const values = await this.translationValueRepository.find({
          where: {
            keyId: key.id
          }
        });

        // Delete ONE and ZERO values and keep the OTHER one as the singular value
        for (const value of values) {
          if (value.quantityString == QuantityString.ONE || value.quantityString == QuantityString.ZERO) {
            await this.translationValueRepository.delete(value.id);
          } else if (value.quantityString == QuantityString.OTHER) {
            value.quantityString = null;
            await this.translationValueRepository.save(value);
          }
        }
      }
    }
    return await this.translationKeyRepository.save(key);
  }

  public async getAllTranslationValues(userId: string, projectId: number, languageId: number): Promise<TranslationValue[]> {
    if (languageId == undefined) {
      throw new BadRequestException(null, "Query parameter `languageId` is missing");
    }
    return this.translationValueRepository.find({
      where: {
        key: {
          projectId: projectId
        },
        languageId: languageId
      }
    });
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
        quantityString: quantityString
      }
    });
    return sameValues.length > 0;
  }

  public async createValue(userId: string, projectId: number, translationKeyId: number, createValueDto: CreateValueDto): Promise<TranslationValue> {
    const language = await this.projectsService.getLanguage(userId, projectId, createValueDto.languageId);
    const key = await this.getTranslationKey(userId, projectId, translationKeyId);

    // If no quantityString provided, assume it should be null.
    const quantityString = createValueDto.quantityString == undefined ? null : createValueDto.quantityString;

    // Check if value already exists for this language and quantity
    const valueExists = await this.translationValuesAlreadyExists(translationKeyId, language.id, quantityString);
    if (valueExists) {
      throw new UnprocessableEntityException(QueryFailedErrorType.VALUE_ALREADY_EXISTS);
    }

    // Check quantity is correct
    if (key.isPlural == false && quantityString !== null) {
      // Quantity should be null for a singular translation key
      throw new UnprocessableEntityException(QueryFailedErrorType.QUANTITY_STRING_NOT_VALID);
    } else if (key.isPlural == true && quantityString === null) {
      // Quantity shouldn't be null for plural key
      throw new UnprocessableEntityException(QueryFailedErrorType.QUANTITY_STRING_NOT_VALID);
    }

    // Create a new translation value
    const value = new TranslationValue();
    value.key = key;
    value.language = language;
    value.name = createValueDto.name;
    value.quantityString = quantityString;
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

  public async getValuesOfLanguage(
    userId: string,
    projectId: number,
    translationKeyId: number,
    languageId: number
  ): Promise<TranslationValue[]> {
    const key = await this.getTranslationKey(userId, projectId, translationKeyId);
    const language = await this.projectsService.getLanguage(userId, projectId, languageId);
    return this.translationValueRepository.find({
      where: {
        keyId: key.id,
        languageId: language.id
      }
    });
  }

  public async getValue(userId: string, projectId: number, translationKeyId: number, valueId: number): Promise<TranslationValue> {
    const key = await this.getTranslationKey(userId, projectId, translationKeyId);
    const value = await this.translationValueRepository.findOne(valueId);
    if (!value || value.keyId !== key.id) {
      throw new NotFoundException();
    }
    return value;
  }
}