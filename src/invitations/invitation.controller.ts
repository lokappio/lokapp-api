import {Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards, UseInterceptors} from "@nestjs/common";
import {ApiBearerAuth, ApiTags} from "@nestjs/swagger";
import {JoiValidationPipe} from "../common/joi-validation.pipe";
import {JwtAuthUserGuard} from "../auth/guards/jwt-auth-user.guard";
import {RolesGuard} from "../roles/roles.guard";
import {UserId} from "../users/user-id.decorator";
import InvitationService from "./invitation.service";
import Invitation from "./invitation.entity";
import CreateInvitationDto from "./dto/create-invitation.dto";
import { Roles } from "../roles/role.decorator";
import Role from "../roles/role.enum";
import UserInvitation from "./model/user-invitation.model";

@ApiBearerAuth()
@ApiTags("Invitations")
@UseGuards(JwtAuthUserGuard, RolesGuard)
@Controller("invitations")
export default class InvitationController {
  constructor(private readonly invitationService: InvitationService) {
  }
  
  @Post()
  @Roles(Role.Owner, Role.Manager)
  public createInvitation(
    @UserId() userId: string,
    @Body(new JoiValidationPipe(CreateInvitationDto.schema)) createInvitationDto: CreateInvitationDto): Promise<Invitation> {
    return this.invitationService.createInvitation(userId, createInvitationDto);
  }

  @Get()
  public getInvitationsForUser(@UserId() userId: string): Promise<UserInvitation[]> {
    return this.invitationService.getInvitationsForUser(userId);
  }

  @Post(":invitation_id/accept")
  public acceptInvitation(
    @UserId() userId: string,
    @Param("invitation_id", ParseIntPipe) invitationId: number): Promise<void> {
    return this.invitationService.acceptInvitation(userId, invitationId);
  }

  @Post(":invitation_id/decline")
  public declineInvitation(
    @UserId() userId: string,
    @Param("invitation_id", ParseIntPipe) invitationId: number): Promise<void> {
    return this.invitationService.declineInvitation(userId, invitationId);
  }

  @Delete(":invitation_id")
  @Roles(Role.Owner, Role.Manager)
  @HttpCode(204)
  public deleteInvitation(
    @UserId() userId: string,
    @Body("project_id", ParseIntPipe) projectId: number,
    @Param("invitation_id", ParseIntPipe) invitationId: number): Promise<void> {
    return this.invitationService.deleteInvitation(userId, projectId, invitationId);
  }
}