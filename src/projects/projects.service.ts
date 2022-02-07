import {Injectable, NotFoundException, UnauthorizedException} from "@nestjs/common";
import CreateProjectDto from "./dto/create-project.dto";
import Project from "./project.entity";
import {InjectRepository} from "@nestjs/typeorm";
import {getManager, Repository} from "typeorm";
import Language from "../languages/language.entity";
import CreateLanguageDto from "./dto/create-language.dto";
import UpdateProjectDto from "./dto/update-project.dto";
import UserProject, {UsersProjectsTableName} from "../users-projects/user_project.entity";
import Role from "../roles/role.enum";
import ProjectUser from "./model/project-user.model";
import Invitation, {InvitationTableName} from "../invitations/invitation.entity";
import UpdateRoleDto from "./dto/update-role.dto";
import {UsersTableName} from "../users/user.entity";
import Group, {DefaultGroupName} from "../groups/group.entity";

@Injectable()
export default class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Language)
    private readonly languagesRepository: Repository<Language>,
    @InjectRepository(UserProject)
    private readonly usersProjectsRepository: Repository<UserProject>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>) {
  }

  public async createUserProjectRelation(userId: string, projectId: number, role: Role): Promise<any> {
    return getManager()
      .createQueryBuilder()
      .insert()
      .into(UsersProjectsTableName)
      .values({
        "projectId": projectId,
        "userId": userId,
        "role": role
      })
      .execute();
  }

  public async doesRelationAlreadyExists(userId: string, projectId: number): Promise<boolean> {
    const relation = await this.usersProjectsRepository.find({
      where: {
        userId: userId,
        projectId: projectId
      }
    });
    return relation.length > 0;
  }

  public async getRoleOfUserInProject(userId: string, projectId: number): Promise<Role> {
    const relation = await this.usersProjectsRepository.findOne({
      where: {
        userId: userId,
        projectId: projectId
      }
    });
    if (!relation) {
      return null;
    }
    return relation.role;
  }

  public async createProject(userId: string, createProjectDto: CreateProjectDto): Promise<Project> {
    // Create project
    const project = new Project();
    project.name = createProjectDto.name;
    project.description = createProjectDto.description;
    project.color = createProjectDto.color;
    const createdProject = await this.projectsRepository.save(project);

    // Create relation between the project and the user
    await this.createUserProjectRelation(userId, createdProject.id, Role.Owner);

    // Create the first language of the project if provided in the DTO
    if (createProjectDto.language != null && createProjectDto.language != "") {
      const createLanguageDto = new CreateLanguageDto({name: createProjectDto.language});
      await this.createLanguage(userId, createdProject.id, createLanguageDto);
    }

    // Create default group
    const group = new Group();
    group.name = DefaultGroupName;
    group.project = createdProject;
    await this.groupRepository.save(group);

    return createdProject;
  }

  public async getUserProjects(userId: string): Promise<Project[]> {
    const usersProjectsSubQuery = getManager()
      .createQueryBuilder(UsersProjectsTableName, UsersProjectsTableName)
      .select("project_id")
      .where("user_id = :id", {id: userId});

    return await this.projectsRepository
      .createQueryBuilder("project")
      .where("project.id IN (" + usersProjectsSubQuery.getQuery() + ")")
      .setParameters(usersProjectsSubQuery.getParameters())
      .getMany();
  }

  public async getProject(userId: string, projectId: number): Promise<Project> {
    // Get project
    const projectFound: Project = await this.projectsRepository.findOne(projectId);

    const canAccessProject = await this.usersProjectsRepository.findOne({
      where: {
        userId: userId,
        projectId: projectId
      }
    });

    if (!projectFound) {
      throw new NotFoundException();
    } else if (!canAccessProject) {
      throw new UnauthorizedException();
    }
    return projectFound;
  }

  public async updateProject(userId: string, projectId: number, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.getProject(userId, projectId);
    project.name = updateProjectDto.name;
    project.color = updateProjectDto.color;
    project.description = updateProjectDto.description;
    return await this.projectsRepository.save(project);
  }

  public async deleteProject(userId: string, projectId: number): Promise<void> {
    const project = await this.getProject(userId, projectId);
    await this.projectsRepository.delete(project.id);
  }

  public async createLanguage(userId: string, projectId: number, createLanguageDto: CreateLanguageDto): Promise<Language> {
    const projectFound = await this.getProject(userId, projectId);

    const language = new Language();
    language.name = createLanguageDto.name;
    language.project = projectFound;
    const createdLanguage = await this.languagesRepository.save(language);
    return this.getLanguage(userId, projectId, createdLanguage.id);
  }

  public async getAllLanguages(userId: string, projectId: number): Promise<Language[]> {
    await this.getProject(userId, projectId);
    return await this.languagesRepository.find({
      where: {
        project: {
          id: projectId
        }
      }
    });
  }

  public async getLanguage(userId: string, projectId: number, languageId: number): Promise<Language> {
    await this.getProject(userId, projectId);
    const language: Language = await this.languagesRepository.findOne(languageId);
    if (!language) {
      throw new NotFoundException();
    }
    return language;
  }

  public async updateLanguage(userId: string, projectId: number, languageId: number, createLanguageDto: CreateLanguageDto): Promise<Language> {
    const language = await this.getLanguage(userId, projectId, languageId);
    language.name = createLanguageDto.name;
    return await this.languagesRepository.save(language);
  }

  public async deleteLanguage(userId: string, projectId: number, languageId: number): Promise<void> {
    await this.getProject(userId, projectId);
    const language = await this.languagesRepository.findOne(languageId);
    if (!language) {
      throw new NotFoundException();
    }
    await this.languagesRepository.delete(languageId);
  }

  public async getUsersOfProject(userId: string, projectId: number): Promise<ProjectUser[]> {
    await this.getProject(userId, projectId);
    const relations = await getManager()
      .createQueryBuilder()
      .select(["relations.user_id AS user_id", "relations.role AS role", "users.username AS username", "users.email AS email"])
      .from(UsersProjectsTableName, "relations")
      .leftJoin(UsersTableName, "users", "relations.user_id = users.id")
      .where("relations.project_id = :project_id")
      .setParameters({project_id: projectId})
      .getRawMany();

    const invitations = await getManager()
      .createQueryBuilder()
      .select(["invitations.guest_id AS guest_id", "invitations.id AS id", "invitations.role AS role", "users.email AS email", "users.username AS username"])
      .from(InvitationTableName, "invitations")
      .leftJoin(UsersTableName, "users", "invitations.guest_id = users.id")
      .where("invitations.project_id = :project_id")
      .setParameters({project_id: projectId})
      .getRawMany();

    const usersFromRelations = relations.map(relation => new ProjectUser(
      relation.user_id,
      relation.username,
      relation.email,
      relation.role,
      false,
      null
    ));

    const usersFromInvitations = invitations.map(invitation => new ProjectUser(
      invitation.guest_id,
      invitation.username,
      invitation.email,
      invitation.role,
      true,
      invitation.id
    ));

    return usersFromRelations.concat(usersFromInvitations);
  }

  public async updateRoleOfUser(userId: string, projectId: number, targetId: string, updateRoleDto: UpdateRoleDto): Promise<ProjectUser> {
    await this.getProject(userId, projectId);
    //Check if target try to update his own role
    if (targetId === userId) {
      throw new UnauthorizedException();
    }
    //Relation of target
    const relation = await this.usersProjectsRepository.findOne({
      where: {
        userId: targetId,
        projectId: projectId
      }
    });
    if (!relation) {
      throw new NotFoundException();
    }

    //Relation of user who wants to update a role
    const relationOfUpdate = await this.usersProjectsRepository.findOne({
      where: {
        userId: userId,
        projectId: projectId
      }
    });
    if (!relationOfUpdate) {
      throw new UnauthorizedException();
    }

    if (relation.role === Role.Owner) {
      throw new UnauthorizedException();
    }

    if (updateRoleDto.role === Role.Owner) {
      if (relationOfUpdate.role === Role.Owner) {
        //The owner want to give project to another one
        relationOfUpdate.role = Role.Manager;
        await this.usersProjectsRepository.save(relationOfUpdate);
      } else {
        //Somebody try to get Ownership of project
        throw new UnauthorizedException();
      }
    }

    relation.role = <Role>updateRoleDto.role;
    await this.usersProjectsRepository.save(relation);

    const updateRelation = await getManager()
      .createQueryBuilder()
      .select(["relations.user_id AS user_id", "relations.role AS role", "users.username AS username", "users.email AS email"])
      .from(UsersProjectsTableName, "relations")
      .leftJoin(UsersTableName, "users", "relations.user_id = users.id")
      .where("relations.project_id = :project_id AND relations.user_id = :user_id")
      .setParameters({project_id: projectId, user_id: targetId})
      .getRawOne();
    return new ProjectUser(
      targetId,
      updateRelation.username,
      updateRelation.email,
      updateRelation.role,
      false,
      null
    );
  }

  public async removeUserFromProject(userId: string, projectId: number, targetId: string): Promise<void> {
    await this.getProject(userId, projectId);
    if (userId === targetId) {
      throw new UnauthorizedException();
    }
    const relation = await this.usersProjectsRepository.findOne({
      where: {
        projectId: projectId,
        userId: targetId
      }
    });
    if (!relation) {
      throw new NotFoundException();
    }
    if (relation.role === Role.Owner) {
      throw new UnauthorizedException();
    }
    await this.usersProjectsRepository.delete(relation);
  }

  public async leaveProject(userId: string, projectId: number): Promise<void> {
    const project = await this.getProject(userId, projectId);
    const relation = await this.usersProjectsRepository.findOne({
      where: {
        projectId: projectId,
        userId: userId
      }
    });
    if (!relation) {
      throw new NotFoundException();
    }
    if (relation.role === Role.Owner) {
      await this.projectsRepository.delete(project.id);
    } else {
      await this.usersProjectsRepository.delete(relation);
    }
  }

  public async getMyselfOnProject(userId: string, projectId: number): Promise<ProjectUser> {
    const users = await this.getUsersOfProject(userId, projectId);
    const user = users.find((user: ProjectUser) => user.userId === userId);
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }
}
