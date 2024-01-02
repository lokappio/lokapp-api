import {ApiHideProperty, ApiProperty} from "@nestjs/swagger";
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

  @ManyToOne(() => Project, (project) => project.id, {onDelete: "CASCADE"})
  @JoinColumn({name: "projectId"})
  @ApiHideProperty()
  public project: Project;

  @ManyToOne(() => User, (user) => user.id, {onDelete: "CASCADE"})
  @JoinColumn({name: "userId"})
  @ApiHideProperty()
  public user: User;

  @Column()
  @ApiProperty()
  public role: Role;

  @Column({nullable: true})
  @ApiProperty()
  sourceLanguagesIds: string;

  @Column({nullable: true})
  @ApiProperty()
  targetLanguagesIds: string;
}
