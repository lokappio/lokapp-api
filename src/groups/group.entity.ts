import {PostgresUniqueKeys} from "../data/database/postgres-unique-keys.enum";
import {Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn} from "typeorm";
import {ApiProperty} from "@nestjs/swagger";
import Project from "../projects/project.entity";

export const GroupTableName: string = "groups";
export const DefaultGroupName: string = "common";

@Entity(GroupTableName)
@Unique(PostgresUniqueKeys.GroupInProject, ["name", "project"])
export default class Group {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  readonly id: number;

  @Column()
  @ApiProperty()
  public name: string;

  @CreateDateColumn()
  @ApiProperty()
  readonly createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty()
  readonly updatedAt: Date;

  @ManyToOne(() => Project, {onDelete: "CASCADE"})
  public project: Project;
}