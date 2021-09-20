import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";

export default class CreateUserDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    id: Joi
      .string()
      .required(),
    username: Joi
      .string()
      .optional()
      .allow(null),
    email: Joi
      .string()
      .required()
  });

  public id: string;
  public username?: string;
  public email: string;
}