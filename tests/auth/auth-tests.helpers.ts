import RegisterUserDto from "../../src/auth/dto/register-user.dto";
import * as request from "supertest";
import {INestApplication} from "@nestjs/common";

export default class AuthTestsHelpers {
  public static async registerUser(app: INestApplication, userId: string, dto: RegisterUserDto): Promise<request.Response> {
    return request(app.getHttpServer())
      .post("/auth/register")
      .auth("mocked.jwt", {type: "bearer"})
      .set("mocked_user_id", userId)
      .send(dto);
  }
}