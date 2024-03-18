import Role from "../../roles/role.enum";
import Language from "../../languages/language.entity";

/**
 * Represents an user within a project.
 * Can be from the `users_projects` relation table or from the `invitations` table.
 * */
export default class ProjectUser {
  userId: string;
  username: string | null;
  email: string;
  role: Role;
  pending: boolean;
  invitationId: number | null;
  sourceLanguages: Language[];
  targetLanguages: Language[];

  constructor(
    userId: string,
    username: string | null,
    email: string,
    role: Role,
    pending: boolean,
    invitationId: number | null,
    sourceLanguages: Language[] = [],
    targetLanguages: Language[] = [],
  ) {
    this.userId = userId;
    this.username = username;
    this.email = email;
    this.role = role;
    this.pending = pending;
    this.invitationId = invitationId;
    this.sourceLanguages = sourceLanguages;
    this.targetLanguages = targetLanguages;
  }
}
