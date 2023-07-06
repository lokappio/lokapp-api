import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";
import CreateValueDto from "./create-value.dto";

export default class CreateKeyDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    name: Joi
      .string()
      .required(),

    groupId: Joi
      .number()
      .allow(null)
      .optional(),

    groupName: Joi
      .string()
      .allow(null)
      .optional(),

    isPlural: Joi
      .boolean()
      .required(),

    values: Joi
      .array()
  });

  public static arraySchema: Joi.ArraySchema = Joi.array().items(CreateKeyDto.schema);

  public name: string;
  public groupId?: number;
  public groupName?: string;
  public isPlural: boolean;
  public values: CreateValueDto[];
}
