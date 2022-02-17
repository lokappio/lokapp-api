import {Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards} from "@nestjs/common";
import {ApiBearerAuth, ApiTags} from "@nestjs/swagger";
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
export default class GroupController {
  constructor(private readonly groupService: GroupService) {
  }

  @Post()
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  public createGroup(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Body(new JoiValidationPipe(CreateGroupDto.schema)) createGroupDto: CreateGroupDto): Promise<Group> {
    return this.groupService.createGroup(userId, projectId, createGroupDto);
  }

  @Get()
  public getAllGroups(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number): Promise<Group[]> {
    return this.groupService.getAllGroups(userId, projectId);
  }

  @Patch(":groupId")
  @Roles(Role.Owner, Role.Manager, Role.Editor)
  public updateGroup(
    @UserId() userId: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Param("groupId", ParseIntPipe) groupId: number,
    @Body(new JoiValidationPipe(UpdateGroupDto.schema)) updateGroupDto: UpdateGroupDto): Promise<Group> {
    return this.groupService.updateGroup(userId, projectId, groupId, updateGroupDto);
  }
}