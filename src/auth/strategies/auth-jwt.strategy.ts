import {PassportStrategy} from "@nestjs/passport";
import {ExtractJwt, Strategy} from "passport-firebase-jwt";
import {Injectable, UnauthorizedException} from "@nestjs/common";
import {auth} from "firebase-admin";
import JwtDecodedUser from "../model/jwt-decoded-user.model";

@Injectable()
export default class AuthJwtStrategy extends PassportStrategy(Strategy, "auth-jwt-strategy") {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
    });
  }

  validate(token: string): Promise<JwtDecodedUser | any> {
    return auth()
      .verifyIdToken(token, true)
      .then((decodedToken) => {
        return new JwtDecodedUser(decodedToken.uid, decodedToken.email);
      })
      .catch(() => {
        throw new UnauthorizedException();
      });
  }
}