import * as Joi from "@hapi/joi";
import BaseDto from "../../data/base.dto";
import QuantityString from "../quantity_string.enum";

export default class CreateValueDto extends BaseDto {
  public static schema: Joi.ObjectSchema = Joi.object({
    name: Joi
      .string()
      .allow('')
      .required(),

    language_id: Joi
      .number()
      .required(),

    quantity_string: Joi
      .string()
      .valid(QuantityString.OTHER, QuantityString.ONE, QuantityString.ZERO, null)
      .optional()
  });

  public name: string;
  public language_id: number;
  public quantity_string: string;
}