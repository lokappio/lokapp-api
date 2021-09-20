import {Injectable} from "@nestjs/common";
import {AuthGuard} from "@nestjs/passport";

@Injectable()
export class JwtAuthUserGuard extends AuthGuard("auth-jwt-user-strategy") {
}