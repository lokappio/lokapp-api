import {Injectable, NotFoundException, UnprocessableEntityException} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import ProjectsService from "../projects/projects.service";
import {Not, Repository} from "typeorm";
import Group from "./group.entity";
import CreateGroupDto from "./dto/create-group.dto";
import {QueryFailedErrorType} from "../common/query-error.filter";
import UpdateGroupDto from "./dto/update-group.dto";

@Injectable()
export default class GroupService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    private readonly projectsService: ProjectsService
  ) {
  }

  public async getGroup(userId: string, projectId: number, groupId: number): Promise<Group> {
    await this.projectsService.getProject(userId, projectId);
    const group: Group = await this.groupRepository.findOne({
      where: {
        id: groupId,
        project: {
          id: projectId
        }
      }
    });
    if (!group) {
      throw new NotFoundException();
    }
    return group;
  }

  public async createGroups(userId: string, projectId: number, createGroupDtos: CreateGroupDto[]): Promise<void> {
    for (const createGroupDto of createGroupDtos) {
      await this.createGroup(userId, projectId, createGroupDto);
    }
  }

  public async createGroup(userId: string, projectId: number, createGroupDto: CreateGroupDto): Promise<Group> {
    const project = await this.projectsService.getProject(userId, projectId);
    const sameGroups = await this.groupRepository.find({
      where: {
        name: createGroupDto.name,
        project: {
          id: projectId
        }
      }
    });

    if (sameGroups.length > 0) {
      throw new UnprocessableEntityException(QueryFailedErrorType.GROUP_ALREADY_EXISTS);
    }

    const group = new Group();
    group.name = createGroupDto.name;
    group.project = project;
    return await this.groupRepository.save(group);
  }

  public async findOrCreateGroup(userId: string, projectId: number, createGroupDto: CreateGroupDto): Promise<Group> {
    const project = await this.projectsService.getProject(userId, projectId);
    const existingGroup = await this.groupRepository.findOne({
      where: {
        name: createGroupDto.name,
        project: {
          id: projectId
        }
      }
    });
    if (existingGroup != undefined) {
      return existingGroup;
    }

    const group = new Group();
    group.name = createGroupDto.name;
    group.project = project;
    return await this.groupRepository.save(group);
  }

  public async getAllGroups(userId: string, projectId: number): Promise<Group[]> {
    await this.projectsService.getProject(userId, projectId);
    return this.groupRepository.find({
      where: {
        project: {
          id: projectId
        }
      }
    });
  }

  public async updateGroup(userId: string, projectId: number, groupId: number, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const group = await this.getGroup(userId, projectId, groupId);
    const sameGroups = await this.groupRepository.find({
      where: {
        name: updateGroupDto.name,
        id: Not(groupId),
        project: {
          id: projectId
        }
      }
    });
    if (sameGroups.length > 0) {
      throw new UnprocessableEntityException(QueryFailedErrorType.GROUP_ALREADY_EXISTS);
    }
    group.name = updateGroupDto.name;
    return await this.groupRepository.save(group);
  }
}
