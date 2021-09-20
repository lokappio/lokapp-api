import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export const ProjectsTableName: string = "projects";

@Entity(ProjectsTableName)
export default class Project {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  readonly id: number;

  @Column()
  @ApiProperty()
  public name: string;

  @Column({nullable: true})
  @ApiPropertyOptional()
  public description?: string;

  @Column()
  @ApiProperty()
  public color: string;

  @CreateDateColumn()
  @ApiProperty()
  readonly created_at: Date;

  @UpdateDateColumn()
  @ApiProperty()
  readonly updated_at: Date;

}