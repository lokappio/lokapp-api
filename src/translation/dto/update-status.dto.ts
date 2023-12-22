import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";
import QuantityString from "../quantity_string.enum";
import TranslationStatus from "../translation_status.enum";

export default class UpdateStatusDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    status: Joi
      .string()
      .valid(TranslationStatus.MODIFIED, TranslationStatus.VALIDATED, TranslationStatus.INVALIDATED)
      .required()
  });
  public status: string;
}
