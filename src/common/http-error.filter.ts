import {ArgumentsHost, Catch, ExceptionFilter, HttpException} from "@nestjs/common";
import {Response} from "express";
import {isString} from "@nestjs/common/utils/shared.utils";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const jsonResponse = {
      status_code: status,
      message: exception.message
    };

    const exceptionResponse = exception.getResponse()["error"];
    if (exceptionResponse && isString(exceptionResponse)) {
      jsonResponse["error"] = exceptionResponse;
    }

    response
      .status(status)
      .json(jsonResponse);
  }
}