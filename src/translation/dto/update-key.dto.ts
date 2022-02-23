import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";

export default class UpdateKeyDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    name: Joi
      .string(),

    groupId: Joi
      .number(),

    isPlural: Joi
      .boolean()

  }).or("name", "groupId", "isPlural");

  public name?: string;
  public groupId?: number;
  public isPlural?: boolean;
}