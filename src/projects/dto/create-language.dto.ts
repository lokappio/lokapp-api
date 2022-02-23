import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";

export default class CreateLanguageDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    name: Joi
      .string()
      .required()
      .max(80)
  });

  public name: string;
}