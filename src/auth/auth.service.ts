import {Injectable} from "@nestjs/common";
import UsersService from "../users/users.service";
import User from "../users/user.entity";
import RegisterUserDto from "./dto/register-user.dto";

@Injectable()
export default class AuthService {
  constructor(private usersService: UsersService) {
  }

  public async register(userId: string, registrationData: RegisterUserDto): Promise<User> {
    return await this.usersService.create({id: userId, ...registrationData});
  }

  public async getUserById(userId: string): Promise<User | any> {
    return this.usersService.getUser(userId);
  }
}