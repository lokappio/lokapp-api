import * as Joi from "@hapi/joi";
import Role from "../../roles/role.enum";
import BaseDto from "../../data/base.dto";

export default class UpdateRoleDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    role: Joi
      .string()
      .valid(Role.Owner, Role.Manager, Role.Editor, Role.Translator, Role.Reviewer)
      .required(),

    sourceLanguagesIds: Joi
      .string(),

    targetLanguagesIds: Joi
      .string()
  });
  public role: string;
  public sourceLanguagesIds: string;
  public targetLanguagesIds: string;
}
