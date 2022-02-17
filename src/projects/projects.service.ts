import {ForbiddenException, Injectable, MethodNotAllowedException, NotFoundException} from "@nestjs/common";
import CreateProjectDto from "./dto/create-project.dto";
import Project from "./project.entity";
import {InjectRepository} from "@nestjs/typeorm";
import {getManager, In, Repository} from "typeorm";
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
import TranslationValue from "../translation/translation_value.entity";
import TranslationKey from "../translation/translation_key.entity";
import DetailedProject from "./detailed-model/detailed-project.model";
import QuantityString from "../translation/quantity_string.enum";

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
    @InjectRepository(TranslationValue)
    private readonly valueRepository: Repository<TranslationValue>,
    @InjectRepository(TranslationKey)
    private readonly keyRepository: Repository<TranslationKey>,
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
    const project: Project = await this.projectsRepository.findOne(projectId);
    const canAccessProject = await this.usersProjectsRepository.findOne({
      where: {
        userId: userId,
        projectId: projectId
      }
    });

    if (!project) {
      throw new NotFoundException();
    } else if (!canAccessProject) {
      throw new ForbiddenException();
    }
    return project;
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

  public async getWholeProjectDetails(userId: string, projectId: number): Promise<DetailedProject> {
    const project = await this.getProject(userId, projectId);
    const rawLanguages = await this.languagesRepository.find({where: {project: {id: project.id}}});
    const rawGroups = await this.groupRepository.find({where: {project: {id: project.id}}});
    const rawKeys = await this.keyRepository.find({where: {project: {id: project.id}}});
    const rawValues = await this.valueRepository.find({where: {key_id: In(rawKeys.map(k => k.id))}});
    return DetailedProject.map(project, rawLanguages, rawGroups, rawKeys, rawValues);
  }

  public async createLanguage(userId: string, projectId: number, createLanguageDto: CreateLanguageDto): Promise<Language> {
    const project = await this.getProject(userId, projectId);
    const language = new Language();
    language.name = createLanguageDto.name;
    language.project = project;

    const createdLanguage = await this.languagesRepository.save(language);

    const projectKeys: TranslationKey[] = await this.keyRepository.find({projectId: projectId});

    await Promise.all(projectKeys.map(async (key) => {
      if (key.is_plural) {
        await Promise.all(Object.values(QuantityString).map(async (quantity) => {
          const value = new TranslationValue();
          value.name = "";
          value.key = key;
          value.quantity_string= quantity;
          value.language= language;

          return await this.valueRepository.save(value);
        }));
      } else {
        const value = new TranslationValue();
        value.name = "";
        value.key = key;
        value.language= language;

        return await this.valueRepository.save(value);
      }
    }));

    return createdLanguage;
  }

  public async getAllLanguages(userId: string, projectId: number): Promise<Language[]> {
    const project = await this.getProject(userId, projectId);
    return await this.languagesRepository.find({
      where: {
        project: {
          id: project.id
        }
      }
    });
  }

  public async getLanguage(userId: string, projectId: number, languageId: number): Promise<Language> {
    const project = await this.getProject(userId, projectId);
    const language: Language = await this.languagesRepository.findOne(languageId);
    if (!language || language.projectId != project.id) {
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
    const project = await this.getProject(userId, projectId);
    const language = await this.getLanguage(userId, project.id, languageId);
    await this.languagesRepository.delete(language.id);
  }

  /**
   * Returns the list of users within the project + the pending invitations
   * */
  public async getUsersOfProject(userId: string, projectId: number): Promise<ProjectUser[]> {
    const project = await this.getProject(userId, projectId);
    const relations = await getManager()
      .createQueryBuilder()
      .select(["relations.user_id AS user_id", "relations.role AS role", "users.username AS username", "users.email AS email"])
      .from(UsersProjectsTableName, "relations")
      .leftJoin(UsersTableName, "users", "relations.user_id = users.id")
      .where("relations.project_id = :project_id")
      .setParameters({project_id: project.id})
      .getRawMany();

    const invitations = await getManager()
      .createQueryBuilder()
      .select(["invitations.guest_id AS guest_id", "invitations.id AS id", "invitations.role AS role", "users.email AS email", "users.username AS username"])
      .from(InvitationTableName, "invitations")
      .leftJoin(UsersTableName, "users", "invitations.guest_id = users.id")
      .where("invitations.project_id = :project_id")
      .setParameters({project_id: project.id})
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

  public async updateRoleOfUser(userId: string, projectId: number, userIdToUpdate: string, updateRoleDto: UpdateRoleDto): Promise<ProjectUser> {
    // Get the relation of the user editing the role
    const editorRelation = await this.usersProjectsRepository.findOne({
      where: {
        userId: userId,
        projectId: projectId
      }
    });
    if (!editorRelation) {
      throw new ForbiddenException(null, "No access to this project.");
    }

    // Check the user isn't changing its own role
    if (userIdToUpdate === userId) {
      throw new ForbiddenException(null, "User can't change its own role.");
    }

    // Get the relation of the user being updated
    const changingRelation = await this.usersProjectsRepository.findOne({
      where: {
        userId: userIdToUpdate,
        projectId: projectId
      }
    });
    if (!changingRelation) {
      throw new NotFoundException();
    }

    // When trying to change the role of the owner
    if (changingRelation.role === Role.Owner) {
      throw new ForbiddenException(null, "Can't change the role of the current owner.");
    }

    // Transferring ownership to another user
    if (updateRoleDto.role === Role.Owner) {
      if (editorRelation.role === Role.Owner) {
        // Previous owner will become a "Manager"
        editorRelation.role = Role.Manager;
        await this.usersProjectsRepository.save(editorRelation);
      } else {
        throw new ForbiddenException(null, "Only the owner can transfer the project's ownership.");
      }
    }

    changingRelation.role = <Role>updateRoleDto.role;
    const updatedRelation = await this.usersProjectsRepository.save(changingRelation);

    const updatedUser = await getManager()
      .createQueryBuilder()
      .select(["users.id AS id", "users.username AS username", "users.email AS email"])
      .from(UsersTableName, "users")
      .where("users.id = :user_id")
      .setParameters({user_id: userIdToUpdate})
      .getRawOne();
    return new ProjectUser(
      userIdToUpdate,
      updatedUser.username,
      updatedUser.email,
      updatedRelation.role,
      false,
      null
    );
  }

  public async removeUserFromProject(userId: string, projectId: number, userIdToDelete: string): Promise<void> {
    const project = await this.getProject(userId, projectId);
    if (userId === userIdToDelete) {
      throw new MethodNotAllowedException(null, "Can't remove itself from a project with a DELETE, should use the /leave endpoint.");
    }
    // Relation of the user about to be removed from the project
    const relation = await this.usersProjectsRepository.findOne({
      where: {
        projectId: project.id,
        userId: userIdToDelete
      }
    });
    if (!relation) {
      throw new NotFoundException();
    }
    if (relation.role === Role.Owner) {
      throw new ForbiddenException(null, "Can't remove the owner of the project");
    }
    await this.usersProjectsRepository.delete(relation);
  }

  public async leaveProject(userId: string, projectId: number): Promise<void> {
    const project = await this.getProject(userId, projectId);
    const relation = await this.usersProjectsRepository.findOne({
      where: {
        projectId: project.id,
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

  public async getProjectUser(userId: string, projectId: number): Promise<ProjectUser> {
    const users = await this.getUsersOfProject(userId, projectId);
    const user = users.find((user: ProjectUser) => user.userId === userId);
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }
}
