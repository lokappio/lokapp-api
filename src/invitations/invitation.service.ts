import {Injectable, NotFoundException, UnauthorizedException} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import ProjectsService from "../projects/projects.service";
import {getManager, Repository} from "typeorm";
import Invitation, { InvitationTableName } from "./invitation.entity";
import UsersService from "../users/users.service";
import User, { UsersTableName } from "../users/user.entity";
import Project, { ProjectsTableName } from "../projects/project.entity";
import CreateInvitationDto from "./dto/create-invitation.dto";
import Role from "../roles/role.enum";
import UserInvitation from "./model/user-invitation.model";

@Injectable()
export default class InvitationService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    private readonly projectsService: ProjectsService,
    private readonly usersService: UsersService
  ) {
  }

  public async createInvitation(userId: string, createInvitationDto: CreateInvitationDto): Promise<Invitation> {
    const project: Project = await this.projectsService.getProject(userId, createInvitationDto.project_id);
    const guest: User = await this.usersService.getUserByEmail(createInvitationDto.email);
    const owner: User = await this.usersService.getUser(userId);

    const relation = await this.projectsService.doesRelationAlreadyExists(guest.id, project.id);
    if (relation) {
      throw new UnauthorizedException();
    }

    const invitation = new Invitation();
    invitation.guest = guest;
    invitation.owner = owner;
    invitation.project = project;
    invitation.role = <Role>createInvitationDto.role;
    return await this.invitationRepository.save(invitation);
  }

  public async getInvitationsForUser(userId: string): Promise<UserInvitation[]> {
    const invitations = await getManager()
      .createQueryBuilder()
      .select(["invitations.role AS role", "invitations.id AS id", "owner.email AS owner_email", "owner.username AS owner_username", "project.name AS project_name"])
      .from(InvitationTableName, "invitations")
      .leftJoin(UsersTableName, "owner", "invitations.owner_id = owner.id")
      .leftJoin(ProjectsTableName, "project", "invitations.project_id = project.id")
      .where("invitations.guestId = :guest_id")
      .setParameters({guest_id: userId})
      .getRawMany();

    const res = [];
    invitations.forEach((invitation: any) => {
      res.push({
        role: invitation.role,
        id: invitation.id,
        owner_email: invitation.owner_email,
        owner_username: invitation.owner_username,
        project_name: invitation.project_name
      });
    });
    
    return invitations;
  }

  public async acceptInvitation(userId: string, invitationId: number): Promise<void> {
    const actualInvitation = await this.invitationRepository.findOne(invitationId);
    if (!actualInvitation) {
      throw new NotFoundException();
    }
    if (userId !== actualInvitation.guestId) {
      throw new UnauthorizedException();
    }
    await this.projectsService.createUserProjectRelation(userId, actualInvitation.projectId, actualInvitation.role);
    await this.invitationRepository.delete(invitationId);
  }

  public async declineInvitation(userId: string, invitationId: number): Promise<void> {
    const actualInvitation = await this.invitationRepository.findOne(invitationId);
    if (!actualInvitation) {
      throw new NotFoundException();
    }
    if (userId !== actualInvitation.guestId) {
      throw new UnauthorizedException();
    }
    await this.invitationRepository.delete(invitationId);
  }

  public async deleteInvitation(userId: string, projectId: number, invitationId: number): Promise<void> {
    const actualInvitation = await this.invitationRepository.findOne(invitationId);
    if (!actualInvitation) {
      throw new NotFoundException();
    }
    await this.projectsService.getProject(userId, actualInvitation.projectId);
    if (actualInvitation.projectId != projectId) {
      throw new UnauthorizedException();
    }
    if (userId !== actualInvitation.ownerId) {
      throw new UnauthorizedException();
    }
    await this.invitationRepository.delete(invitationId);
  }
}