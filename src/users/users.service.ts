import {BadRequestException, Injectable, NotFoundException} from "@nestjs/common";
import User from "./user.entity";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import CreateUserDto from "./dto/create-user.dto";
import EditUserDto from "./dto/edit-user.dto";

@Injectable()
export default class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {
  }

  public async getUser(id: string): Promise<User> {
    const userFound: User = await this.usersRepository.findOne(id);
    if (!userFound) {
      throw new NotFoundException();
    }
    return userFound;
  }

  public async getUserByEmail(email: string): Promise<User> {
    const userFound: User = await this.usersRepository.findOne({
      where: {
        email: email
      }
    });
    if (!userFound) {
      throw new NotFoundException();
    }
    return userFound;
  }

  public async create(userData: CreateUserDto): Promise<User> {
    const userExists = await this.usersRepository.findOne(userData.id);
    if (userExists) {
      throw new BadRequestException("User already exists");
    }
    return await this.usersRepository.save(userData);
  }

  public async editUser(userId: string, editUserDto: EditUserDto): Promise<User> {
    const user = await this.getUser(userId);
    user.username = editUserDto.username;
    return await this.usersRepository.save(user);
  }
}