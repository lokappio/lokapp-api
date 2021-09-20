import {ApiProperty} from "@nestjs/swagger";
import User from "../users/user.entity";
import {Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Unique} from "typeorm";
import Project from "../projects/project.entity";
import Role from "../roles/role.enum";
import {PostgresUniqueKeys} from "../data/database/postgres-unique-keys.enum";

export const UsersProjectsTableName: string = "users_projects";

@Entity(UsersProjectsTableName)
@Unique(PostgresUniqueKeys.UserInProject, ["project", "user"])
export default class UserProject {
  @PrimaryColumn()
  @ApiProperty()
  projectId: number;

  @PrimaryColumn()
  @ApiProperty()
  userId: string;

  @ManyToOne(() => Project, (project) => project.id, {primary: true, onDelete: "CASCADE"})
  @JoinColumn({name: "project_id"})
  public project: Project;

  @ManyToOne(() => User, (user) => user.id, {primary: true, onDelete: "CASCADE"})
  @JoinColumn({name: "user_id"})
  public user: User;

  @Column()
  @ApiProperty()
  public role: Role;
}