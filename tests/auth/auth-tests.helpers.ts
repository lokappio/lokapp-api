import RegisterUserDto from "../../src/auth/dto/register-user.dto";
import * as request from "supertest";
import {INestApplication} from "@nestjs/common";
import EditUserDto from "../../src/users/dto/edit-user.dto";

export default class AuthTestsHelpers {
  public static async registerUser(app: INestApplication, userId: string, dto: RegisterUserDto): Promise<request.Response> {
    return request(app.getHttpServer())
      .post("/auth/register")
      .auth("mocked.jwt", {type: "bearer"})
      .set("mocked_user_id", userId)
      .send(dto);
  }

  public static async getCurrentUserProfile(app: INestApplication, userId: string): Promise<request.Response> {
    return request(app.getHttpServer())
      .get("/users/me")
      .auth("mocked.jwt", {type: "bearer"})
      .set("mocked_user_id", userId);
  }

  public static async editCurrentUserProfile(app: INestApplication, userId: string, dto: EditUserDto): Promise<request.Response> {
    return request(app.getHttpServer())
      .patch("/users/me")
      .auth("mocked.jwt", {type: "bearer"})
      .set("mocked_user_id", userId)
      .send(dto);
  }
};