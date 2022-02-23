import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";
import QuantityString from "../quantity_string.enum";

export default class CreateValueDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    name: Joi
      .string()
      .allow('')
      .required(),

    languageId: Joi
      .number()
      .required(),

    quantityString: Joi
      .string()
      .valid(QuantityString.OTHER, QuantityString.ONE, QuantityString.ZERO, null)
      .optional()
  });

  public name: string;
  public languageId: number;
  public quantityString: string;
}