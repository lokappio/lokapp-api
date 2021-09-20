import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";

export default class CreateKeyDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    name: Joi
      .string()
      .required(),

    group_id: Joi
      .number()
      .required(),

    is_plural: Joi
      .boolean()
      .required()
  });

  public name: string;
  public group_id: number;
  public is_plural: boolean;
}