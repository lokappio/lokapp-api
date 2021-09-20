import { INestApplication } from "@nestjs/common";
import Language from "../../src/languages/language.entity";
import CreateLanguageDto from "../../src/projects/dto/create-language.dto";
import * as request from "supertest";
import { Repository } from "typeorm";


export default class LanguageHelper {

    public static async dbAddLanguage(languageRepository: Repository<Language>, language: Language): Promise<Language> {
        return await languageRepository.save(language);
    }

    public static async getLanguagesOfProject(app: INestApplication, userId: string, projectId: number): Promise<request.Response> {
        return request(app.getHttpServer())
            .get(`/projects/${projectId}/languages`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }

    public static async createLanguage(app: INestApplication, userId: string, projectId: number, dto: CreateLanguageDto): Promise<request.Response> {
        return request(app.getHttpServer())
            .post(`/projects/${projectId}/languages`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send(dto);
    }

    public static async updateLanguage(app: INestApplication, userId: string, projectId: number, languageId: number, dto: CreateLanguageDto): Promise<request.Response> {
        return request(app.getHttpServer())
            .put(`/projects/${projectId}/languages/${languageId}`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send(dto);
    }

    public static async getLanguageOfProject(app: INestApplication, userId: string, projectId: number, languageId: number): Promise<request.Response> {
        return request(app.getHttpServer())
            .get(`/projects/${projectId}/languages/${languageId}`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }

    public static async deleteLanguage(app: INestApplication, userId: string, projectId: number, languageId: number): Promise<request.Response> {
        return request(app.getHttpServer())
            .delete(`/projects/${projectId}/languages/${languageId}`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }
}