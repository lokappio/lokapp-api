import {ForbiddenException, forwardRef, Inject, Injectable, Logger, NotFoundException, UnauthorizedException, UnprocessableEntityException} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import ProjectsService from "../projects/projects.service";
import {getManager, Repository} from "typeorm";
import Invitation, {InvitationTableName} from "./invitation.entity";
import UsersService from "../users/users.service";
import User, {UsersTableName} from "../users/user.entity";
import Project, {ProjectsTableName} from "../projects/project.entity";
import CreateInvitationDto from "./dto/create-invitation.dto";
import Role from "../roles/role.enum";
import UserInvitation from "./model/user-invitation.model";
import {QueryFailedErrorType} from "../common/query-error.filter";

@Injectable()
export default class InvitationService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    private readonly projectsService: ProjectsService,
    private readonly usersService: UsersService
  ) {
  }

  private readonly logger = new Logger("InvitationService");

  public async createInvitation(userId: string, createInvitationDto: CreateInvitationDto): Promise<Invitation> {
    const project: Project = await this.projectsService.getProject(userId, createInvitationDto.projectId);
    const guest: User = await this.usersService.getUserByEmail(createInvitationDto.email);
    const owner: User = await this.usersService.getUser(userId);

    const relation = await this.projectsService.doesRelationAlreadyExists(guest.id, project.id);
    if (relation) {
      throw new UnprocessableEntityException(QueryFailedErrorType.INVITATION_ALREADY_EXISTS);
    }

    const invitation = new Invitation();
    invitation.guest = guest;
    invitation.owner = owner;
    invitation.project = project;
    invitation.role = <Role>createInvitationDto.role;
    return await this.invitationRepository.save(invitation);
  }

  public async getInvitationsForUser(userId: string): Promise<UserInvitation[]> {
    return (await this.invitationRepository.find({
      relations: ["owner", "project"],
      where: {guestId: userId}
    })).map((invitation) => {
      return new UserInvitation(
        invitation.role,
        invitation.id,
        invitation.owner.email,
        invitation.owner.username,
        invitation.project.name
      )
    });
  }

  public async acceptInvitation(userId: string, invitationId: number): Promise<void> {
    const invitation = await this.invitationRepository.findOneById(invitationId);
    if (!invitation) {
      throw new NotFoundException();
    }
    if (userId !== invitation.guestId) {
      throw new ForbiddenException(null, "Can't accept invitation for someone else");
    }
    await this.projectsService.createUserProjectRelation(userId, invitation.projectId, invitation.role);
    await this.invitationRepository.delete(invitationId);
  }

  public async declineInvitation(userId: string, invitationId: number): Promise<void> {
    const invitation = await this.invitationRepository.findOneById(invitationId);
    if (!invitation) {
      throw new NotFoundException();
    }
    if (userId !== invitation.guestId) {
      throw new ForbiddenException(null, "Can't decline invitation for someone else");
    }
    await this.invitationRepository.delete(invitationId);
  }

  public async deleteInvitation(userId: string, invitationId: number): Promise<void> {
    const invitation = await this.invitationRepository.findOneById(invitationId);
    if (!invitation) {
      throw new NotFoundException();
    }
    const userRole = await this.projectsService.getRoleOfUserInProject(userId, invitation.projectId);
    const rolesAllowedToDelete: Role[] = [Role.Owner, Role.Manager];
    if (!rolesAllowedToDelete.includes(userRole)) {
      throw new ForbiddenException(null, "User isn't allowed to delete the invitation (role)");
    }
    if (userId !== invitation.ownerId) {
      throw new ForbiddenException(null, "User isn't the owner of the invitation");
    }
    await this.invitationRepository.delete(invitationId);
  }
}