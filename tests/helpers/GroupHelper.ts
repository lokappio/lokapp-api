import Group from "../../src/groups/group.entity";
import {Repository} from "typeorm";

export default class GroupHelper {
  public static async dbAddGroup(groupRepository: Repository<Group>, group: Group): Promise<Group> {
    return await groupRepository.save(group);
  }
}