import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";

export default class UpdateProjectDto extends BaseDto {
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
      .required()
      .allow(null, '')
  });

  public name: string;
  public color: string;
  public description: string;
}