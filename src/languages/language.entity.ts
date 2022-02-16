import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn} from "typeorm";
import {ApiProperty} from "@nestjs/swagger";
import Project from "../projects/project.entity";
import {PostgresUniqueKeys} from "../data/database/postgres-unique-keys.enum";

export const ProjectLanguagesTableName: string = "project_languages";

@Entity(ProjectLanguagesTableName)
@Unique(PostgresUniqueKeys.LanguageInProject, ["name", "project"])
export default class Language {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  readonly id: number;

  @Column()
  @ApiProperty()
  public name: string;

  @Column("int")
  projectId: number;

  @ManyToOne(() => Project, {onDelete: "CASCADE"})
  @JoinColumn({name: "project_id"})
  public project: Project;

  @CreateDateColumn()
  @ApiProperty()
  readonly created_at: Date;

  @UpdateDateColumn()
  @ApiProperty()
  readonly updated_at: Date;
}