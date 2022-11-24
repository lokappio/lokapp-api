import {ArgumentMetadata, BadRequestException, Injectable, PipeTransform} from "@nestjs/common";
import {AnySchema} from "@hapi/joi";

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: AnySchema) {
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
