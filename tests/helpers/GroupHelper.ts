import Group from "../../src/groups/group.entity";
import { Repository } from "typeorm";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import CreateGroupDto from "../../src/groups/dto/create-group.dto";
import UpdateGroupDto from "../../src/groups/dto/update-group.dto";

export default class GroupHelper {

    public static async dbAddGroup(groupRepository: Repository<Group>, group: Group): Promise<Group> {
        return await groupRepository.save(group);
    }

    public static getGroups(app: INestApplication, userId: string, projectId: number): Promise<request.Response> {
        return request(app.getHttpServer())
            .get(`/projects/${projectId}/groups`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId);
    }

    public static createGroup(app: INestApplication, userId: string, projectId: number, dto: CreateGroupDto): Promise<request.Response> {
        return request(app.getHttpServer())
            .post(`/projects/${projectId}/groups`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send(dto);
    }

    public static updateGroup(app: INestApplication, userId: string, projectId: number, groupId: number, dto: UpdateGroupDto): Promise<request.Response> {
        return request(app.getHttpServer())
            .patch(`/projects/${projectId}/groups/${groupId}`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send(dto);
    }
}