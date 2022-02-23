import {ExecutionContext, UnauthorizedException} from "@nestjs/common";

export const mockedAuthGuard = {
  canActivate: (context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;

    if (!headers["authorization"] || !headers["authorization"].includes("Bearer ")) {
      throw new UnauthorizedException();
    }
    request.user = {
      id: headers["mocked_user_id"] ?? "mocked_user_id"
    };
    return true;
  }
};