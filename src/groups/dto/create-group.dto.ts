import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";

export default class CreateGroupDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    name: Joi
      .string()
      .required()
  });

  public name: string;
}