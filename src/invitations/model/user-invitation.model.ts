import Role from "../../roles/role.enum";

export default class UserInvitation {
  role: Role;
  id: number;
  ownerEmail: string;
  ownerUsername: string;
  projectName: string;

  constructor(
    role: Role,
    id: number,
    ownerEmail: string,
    ownerUsername: string,
    projectName: string) {
    this.role = role;
    this.id = id;
    this.ownerEmail = ownerEmail;
    this.ownerUsername = ownerUsername;
    this.projectName = projectName;
  }
}