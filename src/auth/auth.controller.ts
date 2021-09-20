import {Body, Controller, Post, Req, UnauthorizedException, UseGuards} from "@nestjs/common";
import {Request} from "express";
import AuthService from "./auth.service";
import {JwtAuthGuard} from "./guards/jwt-auth.guard";
import {ApiBearerAuth, ApiTags} from "@nestjs/swagger";
import User from "../users/user.entity";
import RegisterUserDto from "./dto/register-user.dto";
import {JoiValidationPipe} from "../common/joi-validation.pipe";

@ApiBearerAuth()
@ApiTags("Authentication")
@Controller("auth")
export default class AuthController {
  constructor(
    private readonly authService: AuthService) {
  }

  @UseGuards(JwtAuthGuard)
  @Post("register")
  public register(@Req() req: Request, @Body(new JoiValidationPipe(RegisterUserDto.schema)) registrationData: RegisterUserDto): Promise<User | any> {
    const userId = (req.user) ? req.user["id"] : null;
    if (!userId) {
      throw new UnauthorizedException("No user id found in the decoded token");
    }
    const userEmail = req.user["email"];
    if (userEmail && !registrationData.email) {
      registrationData.email = userEmail;
    }
    return this.authService.register(userId, registrationData);
  }
}