import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";
import CreateValueDto from "../../translation/dto/create-value.dto";

export default class CreateLanguageDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    name: Joi
      .string()
      .required()
      .max(80),

    values: Joi
      .array()
      .optional()
  });

  public name: string;
  public values: CreateValueDto[];
}