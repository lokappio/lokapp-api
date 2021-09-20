import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";

export default class CreateProjectDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    name: Joi
      .string()
      .required()
      .max(80),
    color: Joi
      .string()
      .required()
      .length(6)
      .hex(),
    description: Joi
      .string()
      .optional()
      .allow(null),
    language: Joi
      .string()
      .optional()
  });

  public name: string;
  public color: string;
  public description?: string;
  public language?: string;
}