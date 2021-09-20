import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";

export default class UpdateKeyDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    name: Joi
      .string(),

    group_id: Joi
      .number(),

    is_plural: Joi
      .boolean()

  }).or("name", "group_id", "is_plural");

  public name?: string;
  public group_id?: number;
  public is_plural?: boolean;
}