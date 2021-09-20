import {PassportStrategy} from "@nestjs/passport";
import {ExtractJwt, Strategy} from "passport-firebase-jwt";
import {BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException} from "@nestjs/common";
import AuthService from "../auth.service";
import {auth} from "firebase-admin";
import User from "../../users/user.entity";

@Injectable()
export default class AuthJwtUserStrategy extends PassportStrategy(Strategy, "auth-jwt-user-strategy") {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
    });
  }

  async validate(token: string): Promise<User> {
    try {
      const decodedToken = await auth().verifyIdToken(token, true);
      return await this.authService.getUserById(decodedToken.uid);
    } catch (error) {
      const httpErrorStatusCode = error instanceof HttpException ? error.getStatus() : HttpStatus.UNAUTHORIZED;
      if (httpErrorStatusCode == HttpStatus.NOT_FOUND) {
        throw new BadRequestException("User does not exist");
      }
      throw new UnauthorizedException();
    }
  }
}
