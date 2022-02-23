import {createParamDecorator, ExecutionContext, UnauthorizedException} from "@nestjs/common";
import User from "./user.entity";

export const UserId = createParamDecorator<string>(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = <User>request.user;
    if (!user) {
      throw new UnauthorizedException("No user provided");
    }
    const userId = user.id;
    if (!userId) {
      throw new UnauthorizedException("No user id provided");
    }
    return userId;
  }
);