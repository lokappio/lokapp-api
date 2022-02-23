import {ArgumentsHost, Catch, ExceptionFilter} from "@nestjs/common";
import {Response} from "express";
import {QueryFailedError} from "typeorm/error/QueryFailedError";

@Catch(QueryFailedError)
export class TestQueryExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const status = (exception["code"] === "SQLITE_CONSTRAINT") ? 422 : 400;

    const jsonResponse = {
      status_code: status,
      message: "The execution of the query failed",
      error: "unknown"
    };

    response
      .status(status)
      .json(jsonResponse);
  }
}