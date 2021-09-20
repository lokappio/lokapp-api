import {Test} from "@nestjs/testing";
import TestDatabaseModule from "../../database/test-database.module";
import {Repository} from "typeorm";
import User from "../../../src/users/user.entity";
import {getRepositoryToken} from "@nestjs/typeorm";
import UsersController from "../../../src/users/users.controller";
import UsersService from "../../../src/users/users.service";
import UsersModule from "../../../src/users/users.module";

describe("UserController", function () {
  let usersController: UsersController;
  let usersService: UsersService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        UsersModule,
        TestDatabaseModule
      ],
      providers: [{
        provide: getRepositoryToken(User),
        useClass: Repository
      }]
    }).compile();

    usersService = moduleRef.get<UsersService>(UsersService);
    usersController = moduleRef.get<UsersController>(UsersController);
  });

  describe("Get authenticated user", () => {
    it("Should return the user with the specified userId", async () => {
      jest.spyOn(usersService, "getUser").mockImplementationOnce((userId: string) => {
        const user = new User(userId, "username");
        return Promise.resolve(user);
      });

      const user = await usersController.getMe("user-id");
      expect(user.id).not.toBeNull();
      expect(user.id).toBe("user-id");
      expect(user.username).toBe("username");
    });
  });
});