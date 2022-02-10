import { INestApplication } from "@nestjs/common";
import Invitation from "../../src/invitations/invitation.entity";
import Project from "../../src/projects/project.entity";
import Role from "../../src/roles/role.enum";
import User from "../../src/users/user.entity";
import { Repository } from "typeorm";
import CreateInvitationDto from "../../src/invitations/dto/create-invitation.dto";
import * as request from "supertest";

export default class InvitationHelper {

    public static async dbAddInvitation(invitationRepository: Repository<Invitation>, project: Project, guest: User, owner: User, role: Role): Promise<Invitation> {
        const invitation = new Invitation();
        invitation.guest = guest;
        invitation.owner = owner;
        invitation.project = project;
        invitation.role = role;
        return await invitationRepository.save(invitation);
    }

    public static createInvitation(app: INestApplication, userId: string, dto: CreateInvitationDto): Promise<request.Response> {
        return request(app.getHttpServer())
            .post(`/invitations`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send(dto);
    }

    public static deleteInvitation(app: INestApplication, userId: string, projectId: number, invitationId: number): Promise<request.Response> {
        return request(app.getHttpServer())
            .delete(`/invitations/${invitationId}`)
            .auth("mocked.jwt", {type: "bearer"})
            .set("mocked_user_id", userId)
            .send({"project_id": projectId});
    }
}