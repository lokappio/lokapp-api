import {INestApplication} from "@nestjs/common";
import * as request from "supertest";
import UpdateProjectDto from "../../src/projects/dto/update-project.dto";
import UpdateRoleDto from "../../src/projects/dto/update-role.dto";

export default class ProjectsTestHelpers {
  public static async getUserProjects(app: INestApplication, userId: string): Promise<request.Response> {
    return request(app.getHttpServer())
      .get("/projects")
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

  public static async updateUserRole(app: INestApplication, userId: string, projectId: number, targetId: string, dto: UpdateRoleDto): Promise<request.Response> {
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
}