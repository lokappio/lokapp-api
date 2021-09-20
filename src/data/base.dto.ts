import * as Joi from "@hapi/joi";

export default abstract class BaseDto {
  public static schema: Joi.ObjectSchema;

  constructor(data: any) {
    Object.assign(this, data);
  }
}
