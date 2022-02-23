import {Body, Controller, Get, Patch, UseGuards} from "@nestjs/common";
import {ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse} from "@nestjs/swagger";
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
@ApiNotFoundResponse({description: "NotFound"})
@ApiUnauthorizedResponse({description: "Unauthorized"})
export default class UsersController {
  constructor(
    private readonly usersService: UsersService) {
  }

  @Get("me")
  @ApiOperation({summary: "Get the current authenticated user"})
  @ApiOkResponse({type: User})
  public getMe(@UserId() userId: string): Promise<User> {
    return this.usersService.getUser(userId);
  }

  @Patch("me")
  @ApiOperation({summary: "Edit information of the current authenticated user"})
  @ApiOkResponse({type: User})
  public editUser(@UserId() userId: string, @Body(new JoiValidationPipe(EditUserDto.schema)) editUserDto: EditUserDto): Promise<User> {
    return this.usersService.editUser(userId, editUserDto);
  }
}
