import {Injectable, NotFoundException, UnprocessableEntityException} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {QueryFailedErrorType} from "../common/query-error.filter";
import ProjectsService from "../projects/projects.service";
import {getManager, In, Not, Repository} from "typeorm";
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

  public async createKey(userId: string, projectId: number, createKeyDto: CreateKeyDto): Promise<TranslationKey> {
    // Check if project already exists and if key already exists
    const projectFound = await this.projectsService.getProject(userId, projectId);
    const sameKeys = await this.translationKeyRepository.find({
      where: {
        name: createKeyDto.name,
        project: {id: projectId},
        group_id: createKeyDto.group_id
      }
    });
    if (sameKeys.length > 0) {
      throw new UnprocessableEntityException(QueryFailedErrorType.KEY_ALREADY_EXISTS);
    }

    // Create my key
    const key = new TranslationKey();
    key.name = createKeyDto.name;
    key.project = projectFound;
    key.is_plural = createKeyDto.is_plural;

    const groupFound = await this.groupsService.getGroup(userId, projectId, createKeyDto.group_id);

    if (!groupFound) {
      throw new NotFoundException();
    }
    key.group = groupFound;

    const createdKey = await this.translationKeyRepository.save(key);

    return this.getKey(userId, projectId, createdKey.id);
  }

  public async getKey(userId: string, projectId: number, keyId: number): Promise<TranslationKey> {
    await this.projectsService.getProject(userId, projectId);

    const key: TranslationKey = await this.translationKeyRepository.findOne(keyId);
    if (!key) {
      throw new NotFoundException();
    }
    return key;
  }

  public async getAllKeys(userId: string, projectId: number): Promise<TranslationKey[]> {
    await this.projectsService.getProject(userId, projectId);
    return this.translationKeyRepository.find({
      where: {
        project: {
          id: projectId
        }
      }
    });
  }

  public async deleteKey(userId: string, projectId: number, keyId: number): Promise<void> {
    await this.getKey(userId, projectId, keyId);
    await this.translationKeyRepository.delete(keyId);
  }

  private async getSameKeys(name: string, projectId: number, groupId: number, baseKeyID: number): Promise<TranslationKey[]> {
    return await this.translationKeyRepository.find({
      where: {
        name: name,
        project: {
          id: projectId,
        },
        group_id: groupId,
        id: Not(baseKeyID)
      }
    });
  }

  public async updateKey(
    userId: string,
    projectId: number,
    keyId: number,
    updateKeyDto: UpdateKeyDto): Promise<TranslationKey> {

    // Check if key exist
    const key = await this.getKey(userId, projectId, keyId);

    if (updateKeyDto.name !== undefined) {
      //Check if name already exists in group
      if ((await this.getSameKeys(updateKeyDto.name, projectId, key.group_id, keyId)).length > 0) {
        throw new UnprocessableEntityException(QueryFailedErrorType.KEY_ALREADY_EXISTS);
      }
      key.name = updateKeyDto.name;
    }

    if (updateKeyDto.group_id !== undefined) {
      //Check if group exists in project
      const groupFound = await this.groupsService.getGroup(userId, projectId, updateKeyDto.group_id);
      if (!groupFound) {
        throw new NotFoundException();
      }
      //Check if name already exists in new group
      if ((await this.getSameKeys(key.name, projectId, updateKeyDto.group_id, keyId)).length > 0) {
        throw new UnprocessableEntityException(QueryFailedErrorType.KEY_ALREADY_EXISTS);
      }
      key.group = groupFound;
    }

    if (updateKeyDto.is_plural !== undefined && updateKeyDto.is_plural !== key.is_plural) {
      // If previous was SINGULAR and current is PLURAL
      if (updateKeyDto.is_plural) {
        key.is_plural = true;


        //CHANGE CURRENT QUANTITY FROM NULL TO OTHER
        const singularValues = await this.translationValueRepository.find({where: {key: key}});
        singularValues.forEach((value: TranslationValue) => {
          value.quantity_string = QuantityString.OTHER;
          this.translationValueRepository.save(value);
        });

        //add values [ONE and ZERO] and Give them the value of OTHER quantity
        [QuantityString.ONE, QuantityString.ZERO].forEach((quantity) => {
          singularValues.forEach((value) => {
            const quantityValue = new TranslationValue();
            quantityValue.key = key;
            quantityValue.language_id = value.language_id;
            quantityValue.quantity_string = quantity;
            quantityValue.name = value.name

            this.translationValueRepository.save(quantityValue);
          })
        })
      }
      // If previous was PLURAL and current is SINGULAR
      else {
        key.is_plural = false;

        // Delete One and Zero values of key
        const valuesToDelete = await this.translationValueRepository.find({
          where: {
            key: key,
            quantity_string: In([QuantityString.ONE, QuantityString.ZERO])
          }
        });
        valuesToDelete.forEach((value: TranslationValue) => {
          this.deleteValue(userId, projectId, key.id, value.id);
        });

        // Change Other values into Null
        const valuesToUpdate = await this.translationValueRepository.find({
          where: {
            key: key,
            quantity_string: QuantityString.OTHER
          }
        });

        valuesToUpdate.forEach((value: TranslationValue) => {
          value.quantity_string = null;
          this.translationValueRepository.save(value);
        });
      }
    }
    await this.translationKeyRepository.save(key);
    return await this.getKey(userId, projectId, keyId);
  }

  public async createValue(
    userId: string,
    projectId: number,
    translationId: number,
    createValueDto: CreateValueDto): Promise<TranslationValue> {

    const languageFound = await this.projectsService.getLanguage(userId, projectId, createValueDto.language_id);
    const key = await this.getKey(userId, projectId, translationId);
    if (key.is_plural == false) {

      // Check if quantity_string is valid
      if (createValueDto.quantity_string !== null) {
        throw new UnprocessableEntityException(QueryFailedErrorType.QUANTITY_STRING_NOT_VALID);
      }

      // Check if value already exists
      const sameValues = await this.translationValueRepository.find({
        where: {
          key: {
            id: translationId
          },
          language: {
            id: createValueDto.language_id
          }
        }
      });
      if (sameValues.length > 0) {
        throw new UnprocessableEntityException(QueryFailedErrorType.VALUE_ALREADY_EXISTS);
      }
    } else {

      // Check if quantity_string is valid
      if (createValueDto.quantity_string === null) {
        throw new UnprocessableEntityException(QueryFailedErrorType.QUANTITY_STRING_NOT_VALID);
      }

      // Check if value already exists
      const sameValues = await this.translationValueRepository.find({
        where: {
          key: {
            id: translationId
          },
          language: {
            id: createValueDto.language_id
          },
          quantity_string: createValueDto.quantity_string
        }
      });
      if (sameValues.length > 0) {
        throw new UnprocessableEntityException(QueryFailedErrorType.VALUE_ALREADY_EXISTS);
      }
    }

    const value = new TranslationValue();
    value.key = key;
    value.language = languageFound;
    value.name = createValueDto.name;
    if (key.is_plural === true) {
      value.quantity_string = createValueDto.quantity_string;
    } else {
      value.quantity_string = null;
    }
    await this.translationValueRepository.save(value);
    return this.translationValueRepository.findOne({
      where: {
        key_id: translationId,
        language_id: languageFound.id,
        quantity_string: createValueDto.quantity_string
      }
    });
  }

  public async getAllValues(
    userId: string,
    projectId: number,
    translationId: number): Promise<TranslationValue[]> {

    await this.getKey(userId, projectId, translationId);
    return this.translationValueRepository.find({
      where: {
        key: {
          id: translationId
        }
      }
    });
  }

  public async updateValue(
    userId: string,
    projectId: number,
    translationId: number,
    valueId: number,
    updateValueDto: UpdateValueDto): Promise<TranslationValue> {

    const value = await this.getValue(userId, projectId, translationId, valueId);

    value.name = updateValueDto.name;
    return await this.translationValueRepository.save(value);
  }

  public async deleteValue(
    userId: string,
    projectId: number,
    translationId: number,
    valueId: number): Promise<void> {

    await this.getValue(userId, projectId, translationId, valueId);
    await this.translationValueRepository.delete(valueId);
  }

  public async getValuesWithLanguage(
    userId: string,
    projectId: number,
    translationId: number,
    languageId: number): Promise<TranslationValue[]> {

    await this.getKey(userId, projectId, translationId);
    const language = await this.projectsService.getLanguage(userId, projectId, languageId);
    return this.translationValueRepository.find({
      where: {
        key_id: translationId,
        language_id: language.id
      }
    });
  }

  public async getEveryValuesOfProject(
    userId: string,
    projectId: number): Promise<any[]> {

    await this.projectsService.getProject(userId, projectId);

    return await getManager()
      .createQueryBuilder()
      .select(["t_keys.id AS key_id", "t_keys.name AS key_name", "t_keys.is_plural AS is_plural", "t_values.id AS value_id", "t_values.name AS value_name", "t_values.quantity_string AS quantity", "lang.id AS language_id", "lang.name AS language_name", "group.id AS group_id", "group.name AS group_name"])
      .from("translation_keys", "t_keys")
      .leftJoin("project_languages", "lang", "t_keys.project_id = lang.project_id")
      .leftJoin("translation_values", "t_values", "t_keys.id = t_values.key_id AND t_values.language_id = lang.id")
      .leftJoin("groups", "group", "t_keys.project_id = group.project_id AND t_keys.group_id = group.id")
      .where("t_keys.project_id = :project_id")
      .setParameters({project_id: projectId})
      .orderBy("t_keys.id, lang.id")
      .getRawMany();
  }

  public async getValue(
    userId: string,
    projectId: number,
    translationId: number,
    valueId: number): Promise<TranslationValue> {

    await this.getKey(userId, projectId, translationId);
    const value = await this.translationValueRepository.findOne(valueId);
    if (!value || value.key_id !== translationId) {
      throw new NotFoundException();
    }
    return value;
  }
}