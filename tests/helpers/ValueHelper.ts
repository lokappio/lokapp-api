import { INestApplication } from "@nestjs/common";
import CreateValueDto from "../../src/translation/dto/create-value.dto";
import * as request from "supertest";
import UpdateValueDto from "../../src/translation/dto/update-value.dto";
import { Repository } from "typeorm";
import TranslationValue from "../../src/translation/translation_value.entity";


export default class ValueHelper {

    public static async dbAddValue(valueRepository: Repository<TranslationValue>, value: TranslationValue): Promise<TranslationValue> {
        return await valueRepository.save(value);
    }

    public static async createValue(app: INestApplication, userId: string, projectId: number, keyId: number, dto: CreateValueDto): Promise<request.Response> {
        return request(app.getHttpServer())
            .post(`/projects/${projectId}/translations/${keyId}/values`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send(dto);
    }

    public static async updateValue(app: INestApplication, userId: string, projectId: number, keyId: number, valueId: number, dto: UpdateValueDto): Promise<request.Response> {
        return request(app.getHttpServer())
            .patch(`/projects/${projectId}/translations/${keyId}/values/${valueId}`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send(dto);
    }

    public static async deleteValue(app: INestApplication, userId: string, projectId: number, keyId: number, valueId: number): Promise<request.Response> {
        return request(app.getHttpServer())
        .delete(`/projects/${projectId}/translations/${keyId}/values/${valueId}`)
        .auth("mocked.jwt", {type: "bearer"})
        .set("mocked_user_id", userId);
    }
};