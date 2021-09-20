import {Module} from "@nestjs/common";
import AuthService from "./auth.service";
import UsersModule from "../users/users.module";
import {PassportModule} from "@nestjs/passport";
import AuthJwtStrategy from "./strategies/auth-jwt.strategy";
import AuthController from "./auth.controller";
import AuthJwtUserStrategy from "./strategies/auth-jwt-user.strategy";

@Module({
  imports: [UsersModule, PassportModule],
  providers: [AuthService, AuthJwtStrategy, AuthJwtUserStrategy],
  controllers: [AuthController]
})
export default class AuthModule {
}