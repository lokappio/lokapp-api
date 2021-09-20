import {ArgumentsHost, Catch, ExceptionFilter} from "@nestjs/common";
import {Response} from "express";
import {QueryFailedError} from "typeorm/error/QueryFailedError";
import {PostgresErrorCode} from "../data/database/postgres-error-codes.enum";
import {PostgresUniqueKeys} from "../data/database/postgres-unique-keys.enum";

export enum QueryFailedErrorType {
  UNKNOWN = "unknown",
  LANGUAGE_NAME_ALREADY_EXISTS = "language_name_already_exists",
  USER_ALREADY_EXISTS = "user_already_exists",
  KEY_ALREADY_EXISTS = "key_already_exists",
  VALUE_ALREADY_EXISTS = "value_already_exists",
  GROUP_ALREADY_EXISTS = "group_already_exists",
  QUANTITY_STRING_NOT_VALID = "quantity_string_not_valid"
}

@Catch(QueryFailedError)
export class QueryExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const status = exception instanceof QueryFailedError ? 422 : 400;

    const jsonResponse = {
      status_code: status,
      message: "The execution of the query failed",
      error: QueryFailedErrorType.UNKNOWN
    };

    if (exception["code"] === PostgresErrorCode.UniqueViolation) {
      if (exception["constraint"] === PostgresUniqueKeys.LanguageInProject) {
        jsonResponse.error = QueryFailedErrorType.LANGUAGE_NAME_ALREADY_EXISTS;
      } else if (exception["constraint"] === PostgresUniqueKeys.UserEmail) {
        jsonResponse.error = QueryFailedErrorType.USER_ALREADY_EXISTS;
      }
    }

    response
      .status(status)
      .json(jsonResponse);
  }
}