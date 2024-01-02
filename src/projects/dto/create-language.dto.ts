import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";
import CreateGroupDto from "../../groups/dto/create-group.dto";

export default class CreateLanguageDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    name: Joi
      .string()
      .required()
      .max(80),

    groups: Joi
      .array()
      .optional()
  });

  public name: string;
  public groups: CreateGroupDto[];
}
