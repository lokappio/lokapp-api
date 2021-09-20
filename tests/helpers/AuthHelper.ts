import RegisterUserDto from "../../src/auth/dto/register-user.dto";
import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import EditUserDto from "../../src/users/dto/edit-user.dto";
import { Repository } from "typeorm";
import User from "../../src/users/user.entity";

export default class AuthHelper {

    public static async dbAddUser(userRepository: Repository<User>, user: User) {
        await userRepository.save(user);
    }
    
    public static async registerClient(app: INestApplication, userId: string = null, dto: RegisterUserDto): Promise<request.Response> {
        const req = request(app.getHttpServer())
            .post("/auth/register")
            .auth("mocked.jwt", {type: "bearer"});
        if (userId) {
            req.set("mocked_user_id", userId);
        }
        return req.send(dto);
    }

    public static async getProfile(app: INestApplication, userId: string): Promise<request.Response> {
        return request(app.getHttpServer())
            .get("/users/me")
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }

    public static async updateProfile(app: INestApplication, userId: string, dto: EditUserDto): Promise<request.Response> {
        return request(app.getHttpServer())
            .patch("/users/me")
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send(dto);
    }
};