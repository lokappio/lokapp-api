import TranslationKey from "../../src/translation/translation_key.entity";
import { Repository } from "typeorm";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import CreateKeyDto from "src/translation/dto/create-key.dto";
import UpdateKeyDto from "src/translation/dto/update-key.dto";

export default class KeyHelper {
    
    public static async dbAddKey(keyRepository: Repository<TranslationKey>, key: TranslationKey): Promise<TranslationKey> {
        return await keyRepository.save(key);
    }

    public static getKeysOfProject(app: INestApplication, userId: string, projectId: number): Promise<request.Response> {
        return request(app.getHttpServer())
            .get(`/projects/${projectId}/translations`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }

    public static createKey(app: INestApplication, userId: string, projectId: number, dto: CreateKeyDto): Promise<request.Response> {
        return request(app.getHttpServer())
            .post(`/projects/${projectId}/translations`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send(dto);
    }

    public static getKey(app: INestApplication, userId: string, projectId: number, keyId: number): Promise<request.Response> {
        return request(app.getHttpServer())
            .get(`/projects/${projectId}/translations/${keyId}`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }

    public static deleteKey(app: INestApplication, userId: string, projectId: number, keyId: number): Promise<request.Response> {
        return request(app.getHttpServer())
            .delete(`/projects/${projectId}/translations/${keyId}`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }

    public static updateKey(app: INestApplication, userId: string, projectId: number, keyId: number, dto: UpdateKeyDto): Promise<request.Response> {
        return request(app.getHttpServer())
            .patch(`/projects/${projectId}/translations/${keyId}`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send(dto);
    }

    public static getEveryKeysValues(app: INestApplication, userId: string, projectId: number): Promise<request.Response> {
        return request(app.getHttpServer())
            .get(`/projects/${projectId}/translations/all`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }
}