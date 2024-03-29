import {ForbiddenException, forwardRef, Inject, Injectable, Logger, MethodNotAllowedException, NotFoundException} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {In, Repository} from "typeorm";
import Group, {DefaultGroupName} from "../groups/group.entity";
import GroupService from "../groups/group.service";
import Invitation from "../invitations/invitation.entity";
import Language, {LanguageAccess} from "../languages/language.entity";
import Role from "../roles/role.enum";
import TranslationService from "../translation/translation.service";
import TranslationKey from "../translation/translation_key.entity";
import TranslationValue from "../translation/translation_value.entity";
import UserProject from "../users-projects/user_project.entity";
import User from "../users/user.entity";
import DetailedProject from "./detailed-model/detailed-project.model";
import CreateLanguageDto from "./dto/create-language.dto";
import CreateProjectDto from "./dto/create-project.dto";
import UpdateProjectDto from "./dto/update-project.dto";
import UpdateRoleDto from "./dto/update-role.dto";
import ProjectUser from "./model/project-user.model";
import Project from "./project.entity";
import QuantityString from "../translation/quantity_string.enum";

@Injectable()
export default class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Language)
    private readonly languagesRepository: Repository<Language>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserProject)
    private readonly usersProjectsRepository: Repository<UserProject>,
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(TranslationValue)
    private readonly valueRepository: Repository<TranslationValue>,
    @InjectRepository(TranslationKey)
    private readonly keyRepository: Repository<TranslationKey>,
    @Inject(forwardRef(() => TranslationService)) private readonly translationService: TranslationService,
    @Inject(forwardRef(() => GroupService)) private readonly groupService: GroupService,
  ) {
  }

  private readonly logger = new Logger("ProjectsService");

  public async createUserProjectRelation(userId: string, projectId: number, role: Role, sourceLanguagesIds: string = null, targetLanguagesIds: string = null): Promise<any> {
    return this.usersProjectsRepository.save({
      "projectId": projectId,
      "userId": userId,
      "role": role,
      "sourceLanguagesIds": sourceLanguagesIds,
      "targetLanguagesIds": targetLanguagesIds,
    });
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
    if (createProjectDto.languages != null && createProjectDto.languages.length > 0) {
      await Promise.all(createProjectDto.languages.map(async (language: string) => {
        const createLanguageDto = new CreateLanguageDto({name: language});
        const createdLanguage: Language = await this.createLanguage(userId, createdProject.id, createLanguageDto);

        // Create values for the language if the project in DTO has groups
        if (createProjectDto.groups != null && createProjectDto.groups.length > 0) {
          createProjectDto.groups.forEach(group => {
            group.keys.forEach(key => {
              key.values.forEach(value => {
                if (value.languageName != language) {
                  return
                }

                value.languageId = createdLanguage.id
              })
            })
          })
        }
      }))
    }

    // Create default group
    const group = new Group();
    group.name = DefaultGroupName;
    group.project = createdProject;
    await this.groupRepository.save(group);

    if (createProjectDto.groups) {
      for (const groupDto of createProjectDto.groups) {
        const group = await this.groupService.findOrCreateGroup(userId, createdProject.id, groupDto);

        for (const key of groupDto.keys) {
          key.groupName = group.name;
          await this.translationService.createTranslationKey(userId, createdProject.id, key);
        }
      }
    }

    return createdProject;
  }

  public async getUserProjects(userId: string): Promise<Project[]> {
    return await this.projectsRepository.find({
      where: {
        userProjects: {
          userId: userId
        }
      }
    });
  }

  public async getProject(userId: string, projectId: number): Promise<Project> {
    const project: Project = await this.projectsRepository.findOne({
      relations: ["userProjects"],
      where: {
        id: projectId
      }
    });
    const canAccessProject = await this.usersProjectsRepository.findOneBy({
      userId: userId,
      projectId: projectId
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
    const languages = await this.languagesRepository.find({where: {project: {id: project.id}}});
    const userProject = project.userProjects.find(relation => relation.userId === userId);
    const rawLanguages = this.filterUserLanguages(languages, userProject);
    const rawGroups = await this.groupRepository.find({where: {project: {id: project.id}}});
    const rawKeys = await this.keyRepository.find({where: {project: {id: project.id}}});
    const rawValues = await this.valueRepository.find({where: {keyId: In(rawKeys.map(k => k.id))}});
    return DetailedProject.map(project, rawLanguages, rawGroups, rawKeys, rawValues);
  }

  public async createLanguage(userId: string, projectId: number, createLanguageDto: CreateLanguageDto): Promise<Language> {
    const project = await this.getProject(userId, projectId);
    const language = new Language();
    language.name = createLanguageDto.name;
    language.project = project;

    let createdLanguage = await this.languagesRepository.findOneBy({name: language.name, projectId: project.id});
    if (!createdLanguage) {
      createdLanguage = await this.languagesRepository.save(language);
    }

    const allLanguages = await this.languagesRepository.findBy({
      projectId: projectId
    });

    // Find all translation keys of the project in order to create the translation values for the new language
    const projectKeys: TranslationKey[] = await this.keyRepository.findBy({projectId: projectId});

    // We check if the language to create has groups
    if (createLanguageDto.groups && createLanguageDto.groups.length > 0) {
      await Promise.all(createLanguageDto.groups.map(async (groupToCreate) => {
        // We check if the group already exists
        let group = await this.groupRepository.findOneBy({name: groupToCreate.name, projectId: projectId});
        // If not, we create it
        if (!group) {
          group = new Group();
          group.projectId = project.id;
          group.name = groupToCreate.name;
          group = await this.groupRepository.save(group);
        }

        // We check if the group has keys
        if (groupToCreate.keys && groupToCreate.keys.length > 0) {
          await Promise.all(groupToCreate.keys.map(async (keyToCreate) => {
            // We check if the key already exists
            let key = await this.keyRepository.findOneBy({name: keyToCreate.name, groupId: group.id});
            // If not, we create it
            if (!key) {
              key = new TranslationKey();
              key.projectId = project.id;
              key.groupId = group.id;
              key.name = keyToCreate.name;
              key.isPlural = keyToCreate.isPlural;
              key = await this.keyRepository.save(key);
            }

            // We check if the key has values
            if (keyToCreate.values && keyToCreate.values.length > 0) {
              await Promise.all(keyToCreate.values.map(async (valueToCreate) => {
                if (valueToCreate.languageName != createdLanguage.name) return;
                // We check if values already exists
                const values = await this.valueRepository.findBy({keyId: key.id});
                allLanguages.forEach(language => {
                  const valueExists = values.find(value => value.languageId === language.id);
                  // If this is the language we are importing and replaceExistingKeys is true, we replace the value
                  const shouldReplaceValue = language.id === createdLanguage.id && createLanguageDto.replaceExistingKeys;
                  if (!valueExists || shouldReplaceValue) {
                    const value = new TranslationValue();
                    value.keyId = key.id;
                    value.name = language.id === createdLanguage.id ? valueToCreate.name : ""; // Empty if the language is not the one we are creating
                    value.languageId = language.id;
                    value.quantityString = valueToCreate.quantityString;
                    this.valueRepository.save(value);
                  }
                });
              }));
            }
          }));
        }
      }));
    }

    // For each key, automatically create values in the new added language
    await Promise.all(projectKeys.map(async (key) => {
      // We check if the key has values
      const values = await this.valueRepository.findBy({keyId: key.id, languageId: createdLanguage.id});
      // If not, we create it
      if (!values || values.length === 0) {
        if (key.isPlural) {
          await Promise.all(Object.values(QuantityString).map(async (quantity) => {
            const value = new TranslationValue();
            value.name = "";
            value.keyId = key.id;
            value.quantityString = quantity;
            value.languageId = createdLanguage.id;
            return await this.valueRepository.save(value);
          }));
        } else {
          const value = new TranslationValue();
          value.name = "";
          value.keyId = key.id;
          value.languageId = createdLanguage.id;

          return await this.valueRepository.save(value);
        }
      }
    }));

    return createdLanguage;
  }

  public async getAllLanguages(userId: string, projectId: number): Promise<Language[]> {
    const project = await this.getProject(userId, projectId);
    const languages = await this.languagesRepository.find({
      where: {
        project: {
          id: project.id
        }
      }
    });
    const userProject = project.userProjects.find(relation => relation.userId === userId);
    return this.filterUserLanguages(languages, userProject);
  }

  private filterUserLanguages(languages: Language[], userProject: UserProject): Language[] {
    if (userProject.sourceLanguagesIds === null || userProject.targetLanguagesIds === null || userProject.sourceLanguagesIds === "" || userProject.targetLanguagesIds === "") {
      return languages;
    } else {
      const sourceLanguagesIds = userProject.sourceLanguagesIds.split(",").map(id => parseInt(id));
      const targetLanguagesIds = userProject.targetLanguagesIds.split(",").map(id => parseInt(id));
      const languagesIds = sourceLanguagesIds.concat(targetLanguagesIds);
      return languages
        .filter(language => languagesIds.indexOf(language.id) >= 0)
        .map(language => {
          if (sourceLanguagesIds.indexOf(language.id) >= 0) {
            language.access = LanguageAccess.source;
          }
          if (targetLanguagesIds.indexOf(language.id) >= 0) {
            language.access = LanguageAccess.target;
          }
          return language
        });
    }
  }

  public async getLanguage(userId: string, projectId: number, languageId: number): Promise<Language> {
    const project = await this.getProject(userId, projectId);
    const language: Language = await this.languagesRepository.findOneBy({id: languageId});

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

    const relations = await this.usersProjectsRepository.find(
      {
        where: {
          projectId: project.id
        },
        relations: ["user"]
      }
    ) || [];

    const invitations = await this.invitationRepository.find({
      where: {
        projectId: project.id
      },
      relations: ["guest"]
    }) || [];

    const languages = await this.languagesRepository.findBy({
      projectId: project.id
    });

    const usersFromRelations = relations.map(relation => {
      return new ProjectUser(
        relation.userId,
        relation.user.username,
        relation.user.email,
        relation.role,
        false,
        null,
        relation.sourceLanguagesIds ? relation.sourceLanguagesIds.split(",").map(id => languages.find(language => language.id === parseInt(id))).filter(language => language !== undefined) : [],
        relation.targetLanguagesIds ? relation.targetLanguagesIds.split(",").map(id => languages.find(language => language.id === parseInt(id))).filter(language => language !== undefined) : []
      )
    });

    const usersFromInvitations = invitations.map(invitation => new ProjectUser(
      invitation.guestId,
      invitation.guest.username,
      invitation.guest.email,
      invitation.role,
      true,
      invitation.id,
      invitation.sourceLanguagesIds ? invitation.sourceLanguagesIds.split(",").map(id => languages.find(language => language.id === parseInt(id))).filter(language => language !== undefined) : [],
      invitation.targetLanguagesIds ? invitation.targetLanguagesIds.split(",").map(id => languages.find(language => language.id === parseInt(id))).filter(language => language !== undefined) : []
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

    const languages = await this.languagesRepository.findBy({
      projectId: projectId
    });

    changingRelation.role = <Role>updateRoleDto.role;
    changingRelation.sourceLanguagesIds = updateRoleDto.sourceLanguagesIds;
    changingRelation.targetLanguagesIds = updateRoleDto.targetLanguagesIds;
    const updatedRelation = await this.usersProjectsRepository.save(changingRelation);

    const updatedUser = await this.usersRepository.findOneBy({id: userIdToUpdate})

    return new ProjectUser(
      userIdToUpdate,
      updatedUser.username,
      updatedUser.email,
      updatedRelation.role,
      false,
      null,
      updatedRelation.sourceLanguagesIds ? updatedRelation.sourceLanguagesIds.split(",").map(id => languages.find(language => language.id === parseInt(id))).filter(language => language !== undefined) : [],
      updatedRelation.targetLanguagesIds ? updatedRelation.targetLanguagesIds.split(",").map(id => languages.find(language => language.id === parseInt(id))).filter(language => language !== undefined) : []
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
    await this.usersProjectsRepository.delete({
      projectId: project.id,
      userId: userIdToDelete
    });
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
      await this.usersProjectsRepository.delete({
        projectId: project.id,
        userId: userId
      });
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
