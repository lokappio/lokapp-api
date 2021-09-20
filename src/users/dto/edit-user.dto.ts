import BaseDto from "../../data/base.dto";
import * as Joi from "@hapi/joi";

export default class EditUserDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    username: Joi
      .string()
      .optional()
      .allow(null)
  });

  public username?: string;
}