import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";

export default class RegisterUserDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    username: Joi
      .string()
      .optional()
      .allow(null),
    email: Joi
      .string()
      .email()
      .required()
  });

  public username?: string;
  public email: string;
}