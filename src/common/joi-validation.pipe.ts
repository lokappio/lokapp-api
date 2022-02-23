import {ArgumentMetadata, BadRequestException, Injectable, PipeTransform} from "@nestjs/common";
import {ObjectSchema} from "@hapi/joi";

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: ObjectSchema) {
  }

  transform(value: any, metadata: ArgumentMetadata) {
    const {error} = this.schema.validate(value);
    if (error) {
      throw new BadRequestException(
        "Validation failed",
        error.message.replace(/"/g, `'`)
      );
    }
    return value;
  }
}