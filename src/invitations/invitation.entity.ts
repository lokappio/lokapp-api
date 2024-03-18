import {ApiHideProperty, ApiProperty} from "@nestjs/swagger";
import {PostgresUniqueKeys} from "../data/database/postgres-unique-keys.enum";
import Project from "../projects/project.entity";
import Role from "../roles/role.enum";
import User from "../users/user.entity";
import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique} from "typeorm";

export const InvitationTableName: string = "invitations";

@Entity(InvitationTableName)
@Unique(PostgresUniqueKeys.GuestInProject, ["project", "guest"])
export default class Invitation {
  // ID of invitation
  @PrimaryGeneratedColumn()
  @ApiProperty()
  readonly id: number;

  @Column()
  @ApiProperty()
  projectId: number;

  @ManyToOne(() => Project, (project) => project.id, {onDelete: "CASCADE"})
  @JoinColumn({name: "projectId"})
  @ApiHideProperty()
  project: Project;

  // Owner
  @Column()
  @ApiProperty()
  ownerId: string;

  @ManyToOne(() => User, (user) => user.id, {onDelete: "CASCADE"})
  @JoinColumn({name: "ownerId"})
  @ApiHideProperty()
  owner: User;

  // Invited user
  @Column()
  @ApiProperty()
  guestId: string;

  @ManyToOne(() => User, (user) => user.id, {onDelete: "CASCADE"})
  @JoinColumn({name: "guestId"})
  @ApiHideProperty()
  guest: User;

  @Column()
  @ApiProperty()
  role: Role;

  @CreateDateColumn()
  @ApiProperty()
  readonly createdAt: Date;

  @Column({nullable: true})
  @ApiProperty()
  sourceLanguagesIds: string;

  @Column({nullable: true})
  @ApiProperty()
  targetLanguagesIds: string;
}
