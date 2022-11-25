import * as Joi from "@hapi/joi";
import CreateKeyDto from "src/translation/dto/create-key.dto";
import BaseDto from "../../data/base.dto";

export default class CreateGroupDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    name: Joi
      .string()
      .required(),
    keys: Joi
      .array()
  });

  public name: string;
  public keys: CreateKeyDto[];
}
