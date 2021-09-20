import Role from "../../roles/role.enum";

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

  constructor(
    userId: string,
    username: string | null,
    email: string,
    role: Role,
    pending: boolean,
    invitationId: number | null
  ) {
    this.userId = userId;
    this.username = username;
    this.email = email;
    this.role = role;
    this.pending = pending;
    this.invitationId = invitationId;
  }
}