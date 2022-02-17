import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";

export default class CreateKeyDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    name: Joi
      .string()
      .required(),

    groupId: Joi
      .number()
      .required(),

    isPlural: Joi
      .boolean()
      .required()
  });

  public name: string;
  public groupId: number;
  public isPlural: boolean;
}