import {Body, Controller, Get, Patch, UseGuards} from "@nestjs/common";
import {ApiBearerAuth, ApiTags} from "@nestjs/swagger";
import UsersService from "./users.service";
import User from "./user.entity";
import {JwtAuthUserGuard} from "../auth/guards/jwt-auth-user.guard";
import EditUserDto from "./dto/edit-user.dto";
import {UserId} from "./user-id.decorator";
import {JoiValidationPipe} from "../common/joi-validation.pipe";

@ApiBearerAuth()
@ApiTags("Users")
@UseGuards(JwtAuthUserGuard)
@Controller("users")
export default class UsersController {
  constructor(
    private readonly usersService: UsersService) {
  }

  @Get("me")
  public getMe(@UserId() userId: string): Promise<User> {
    return this.usersService.getUser(userId);
  }

  @Patch("me")
  public editUser(@UserId() userId: string, @Body(new JoiValidationPipe(EditUserDto.schema)) editUserDto: EditUserDto): Promise<User> {
    return this.usersService.editUser(userId, editUserDto);
  }
}
