import {Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse, ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse
} from "@nestjs/swagger";
import {JoiValidationPipe} from "../common/joi-validation.pipe";
import {JwtAuthUserGuard} from "../auth/guards/jwt-auth-user.guard";
import {RolesGuard} from "../roles/roles.guard";
import {UserId} from "../users/user-id.decorator";
import InvitationService from "./invitation.service";
import Invitation from "./invitation.entity";
import CreateInvitationDto from "./dto/create-invitation.dto";
import {Roles} from "../roles/role.decorator";
import Role from "../roles/role.enum";
import UserInvitation from "./model/user-invitation.model";
import Group from "../groups/group.entity";

@ApiBearerAuth()
@ApiTags("Invitations")
@UseGuards(JwtAuthUserGuard, RolesGuard)
@Controller("invitations")
@ApiUnauthorizedResponse({description: "Unauthorized"})
@ApiForbiddenResponse({description: "Forbidden"})
@ApiNotFoundResponse({description: "NotFound"})
export default class InvitationController {
  constructor(private readonly invitationService: InvitationService) {
  }

  @Post()
  @Roles(Role.Owner, Role.Manager)
  @ApiOperation({
    summary: "Create a new invitation",
    description: "Currently, the email of the invited user needs to exist in the database"
  })
  @ApiUnprocessableEntityResponse({description: "Unprocessable"})
  @ApiCreatedResponse({type: Invitation})
  public createInvitation(
    @UserId() userId: string,
    @Body(new JoiValidationPipe(CreateInvitationDto.schema)) createInvitationDto: CreateInvitationDto): Promise<Invitation> {
    return this.invitationService.createInvitation(userId, createInvitationDto);
  }

  @Get()
  @ApiOperation({summary: "Get the list of invitations of the authenticated user"})
  @ApiOkResponse({type: [UserInvitation]})
  public getInvitationsForUser(@UserId() userId: string): Promise<UserInvitation[]> {
    return this.invitationService.getInvitationsForUser(userId);
  }

  @Post(":invitationId/accept")
  @ApiOperation({summary: "Accept an invitation"})
  @ApiNoContentResponse({description: "NoContent"})
  @HttpCode(204)
  public acceptInvitation(
    @UserId() userId: string,
    @Param("invitationId", ParseIntPipe) invitationId: number): Promise<void> {
    return this.invitationService.acceptInvitation(userId, invitationId);
  }

  @Post(":invitationId/decline")
  @ApiOperation({summary: "Decline an invitation"})
  @ApiNoContentResponse({description: "NoContent"})
  @HttpCode(204)
  public declineInvitation(
    @UserId() userId: string,
    @Param("invitationId", ParseIntPipe) invitationId: number): Promise<void> {
    return this.invitationService.declineInvitation(userId, invitationId);
  }

  @Delete(":invitationId")
  @ApiOperation({summary: "Cancel an invitation"})
  @ApiNoContentResponse({description: "NoContent"})
  @HttpCode(204)
  public deleteInvitation(
    @UserId() userId: string,
    @Param("invitationId", ParseIntPipe) invitationId: number): Promise<void> {
    return this.invitationService.deleteInvitation(userId, invitationId);
  }
}