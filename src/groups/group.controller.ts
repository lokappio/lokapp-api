import {Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiFoundResponse,
  ApiNotFoundResponse,
  ApiOkResponse, ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse
} from "@nestjs/swagger";
import {JoiValidationPipe} from "../common/joi-validation.pipe";
import {UserId} from "../users/user-id.decorator";
import {JwtAuthUserGuard} from "../auth/guards/jwt-auth-user.guard";
import GroupService from "./group.service";
import Group from "./group.entity";
import CreateGroupDto from "./dto/create-group.dto";
import UpdateGroupDto from "./dto/update-group.dto";
import {RolesGuard} from "../roles/roles.guard";
import {Roles} from "../roles/role.decorator";
import Role from "../roles/role.enum";

@ApiBearerAuth()
@ApiTags("Groups")
@UseGuards(JwtAuthUserGuard, RolesGuard)
@Controller("projects/:projectId/groups")
@ApiUnauthorizedResponse({description: "Unauthorized"})
@ApiForbiddenResponse({description: "Forbidden"})
export default class GroupController {
  constructor(private readonly groupService: GroupService) {
  }

  @Post()
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  @ApiOperation({
    summary: "Create a new group within the project",
    description: "By default, a `common` group is added when creating a project. This endpoint is used to insert new groups."
  })
  @ApiUnprocessableEntityResponse({description: "Unprocessable"})
  @ApiCreatedResponse({type: Group})
  public createGroup(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Body(new JoiValidationPipe(CreateGroupDto.schema)) createGroupDto: CreateGroupDto): Promise<Group> {
    return this.groupService.createGroup(userId, projectId, createGroupDto);
  }

  @Get()
  @ApiOperation({summary: "Get the list of groups within the project"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiOkResponse({type: [Group]})
  public getAllGroups(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number): Promise<Group[]> {
    return this.groupService.getAllGroups(userId, projectId);
  }

  @Get(":groupId")
  @ApiOperation({summary: "Get a group"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiOkResponse({type: Group})
  public getGroupById(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("groupId", ParseIntPipe) groupId: number,): Promise<Group> {
    return this.groupService.getGroup(userId, projectId, groupId);
  }

  @Patch(":groupId")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  @ApiOperation({summary: "Edit a group"})
  @ApiNotFoundResponse({description: "NotFound"})
  @ApiUnprocessableEntityResponse({description: "Unprocessable"})
  @ApiOkResponse({type: [Group]})
  public updateGroup(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("groupId", ParseIntPipe) groupId: number,
    @Body(new JoiValidationPipe(UpdateGroupDto.schema)) updateGroupDto: UpdateGroupDto): Promise<Group> {
    return this.groupService.updateGroup(userId, projectId, groupId, updateGroupDto);
  }
}