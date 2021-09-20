import { INestApplication } from "@nestjs/common";
import Project from "../../src/projects/project.entity";
import * as request from "supertest";
import { Repository } from "typeorm";
import UserProject from "../../src/users-projects/user_project.entity";
import CreateProjectDto from "../../src/projects/dto/create-project.dto";
import UpdateProjectDto from "../../src/projects/dto/update-project.dto";
import UpdateRoleDto from "../../src/projects/dto/update-role.dto";


export default class ProjectHelper {

    public static async dbAddProject(projectRepository: Repository<Project>, project: Project): Promise<Project> {
        return await projectRepository.save(project);
    }

    public static async dbAddUserProjectRelation(userProjectRepository: Repository<UserProject>, userProject: UserProject) {
        await userProjectRepository.save(userProject);
    }

    public static async getProjectsOfUser(app: INestApplication, userId: string): Promise<request.Response> {
        return request(app.getHttpServer())
            .get("/projects")
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }

    public static async createProject(app: INestApplication, userId: string, dto: CreateProjectDto): Promise<request.Response> {
        return request(app.getHttpServer())
            .post("/projects")
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send(dto);
    }

    public static async getProject(app: INestApplication, userId: string, projectId: number): Promise<request.Response> {
        return request(app.getHttpServer())
            .get("/projects/" + projectId)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }

    public static async updateProject(app: INestApplication, userId: string, projectId: number, dto: UpdateProjectDto): Promise<request.Response> {
        return request(app.getHttpServer())
            .put(`/projects/${projectId}`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send(dto);
    }

    public static async deleteProject(app: INestApplication, userId: string, projectId: number): Promise<request.Response> {
        return request(app.getHttpServer())
            .delete(`/projects/${projectId}`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }

    public static async getUsersOfProject(app: INestApplication, userId: string, projectId: number): Promise<request.Response> {
        return request(app.getHttpServer())
            .get(`/projects/${projectId}/users`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }

    public static async updateRoleOfUser(app: INestApplication, userId: string, projectId: number, targetId: string, dto: UpdateRoleDto): Promise<request.Response> {
        return request(app.getHttpServer())
            .patch(`/projects/${projectId}/users/${targetId}`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send(dto);
    }

    public static async removeUserFromProject(app: INestApplication, userId: string, projectId: number, targetId: string): Promise<request.Response> {
        return request(app.getHttpServer())
            .delete(`/projects/${projectId}/users/${targetId}`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }
};