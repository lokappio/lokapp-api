import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";
import Role from "../../roles/role.enum";

export default class CreateInvitationDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    email: Joi
      .string()
      .required(),

    // Role.Owner isn't a valid role when creating an invitation
    role: Joi
      .string()
      .valid(Role.Manager, Role.Translator, Role.Editor)
      .required(),

    project_id: Joi
      .number()
      .required()
  });

  public project_id: number;
  public email: string;
  public role: string;
}