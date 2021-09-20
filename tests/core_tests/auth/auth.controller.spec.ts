import {Test} from "@nestjs/testing";
import {UnauthorizedException} from "@nestjs/common";
import TestDatabaseModule from "../../database/test-database.module";
import AuthController from "../../../src/auth/auth.controller";
import AuthModule from "../../../src/auth/auth.module";
import {Request} from "express";
import RegisterUserDto from "../../../src/auth/dto/register-user.dto";
import {Repository} from "typeorm";
import User from "../../../src/users/user.entity";
import {getRepositoryToken} from "@nestjs/typeorm";
import JwtDecodedUser from "../../../src/auth/model/jwt-decoded-user.model";
import AuthService from "../../../src/auth/auth.service";

describe("AuthController", function () {
  let authController: AuthController;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule,
        TestDatabaseModule
      ],
      providers: [{
        provide: getRepositoryToken(User),
        useClass: Repository
      }]
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    authController = moduleRef.get<AuthController>(AuthController);
  });

  describe("Not authenticated user", () => {
    it("Should throw an UnauthorizedException as the user isn't authenticated", async (done) => {
      const request = {} as unknown as Request;
      try {
        await authController.register(request, {username: "", email: ""});
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        done();
      }
    });
  });

  describe("Authenticated user", () => {
    it("Should return a user", async () => {
      const registrationDTO = new RegisterUserDto({
        username: "username",
        email: "email@email.abc"
      });

      const request = {
        user: {
          id: "user-id",
          email: registrationDTO.email
        }
      } as unknown as Request;

      jest.spyOn(authService, "register").mockImplementationOnce((userId: string, registerData: RegisterUserDto) => {
        const user = new User(userId, registerData.username);
        user.email = registerData.email;
        return Promise.resolve(user);
      });

      const user = await authController.register(request, registrationDTO);
      expect(authService.register).toBeCalledWith((<JwtDecodedUser>(request.user)).id, registrationDTO);
      expect(user.username).toBe(registrationDTO.username);
      expect(user.id).not.toBeNull();
      expect(user.id).toBe((<JwtDecodedUser>(request.user)).id);
      expect(user.email).toBe(registrationDTO.email);
    });
  });
});