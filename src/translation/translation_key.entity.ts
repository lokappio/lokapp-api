import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import Project from "../projects/project.entity";
import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn} from "typeorm";
import {PostgresUniqueKeys} from "../data/database/postgres-unique-keys.enum";
import Group from "../groups/group.entity";

export const TranslationKeysTableName: string = "translation_keys";

@Entity(TranslationKeysTableName)
@Unique(PostgresUniqueKeys.TranslationKeyInGroup, ["name", "group"])
export default class TranslationKey {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  readonly id: number;

  @Column()
  @ApiProperty()
  public name: string;

  @Column()
  @ApiProperty()
  public is_plural: boolean;

  @CreateDateColumn()
  @ApiProperty()
  readonly created_at: Date;

  @UpdateDateColumn()
  @ApiProperty()
  readonly updated_at: Date;

  @Column("int", {nullable: true})
  group_id: number;

  @Column("int")
  projectId: number;

  @ManyToOne(() => Project, {onDelete: "CASCADE"})
  @JoinColumn({name: "project_id"})
  public project: Project;

  @ManyToOne(() => Group, {onDelete: "CASCADE"})
  @JoinColumn({name: "group_id"})
  public group: Group;
}
