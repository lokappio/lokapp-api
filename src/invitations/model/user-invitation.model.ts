import Role from "../../roles/role.enum";

export default class UserInvitation {

    role: Role;
    id: number;
    owner_email: string;
    owner_username: string;
    project_name: string;

    constructor(
        role: Role,
        id: number,
        owner_email: string,
        owner_username: string,
        project_name: string) {
        this.role = role;
        this.id = id;
        this.owner_email = owner_email;
        this.owner_username = owner_username;
        this.project_name = project_name;
    }
};