import {Column, CreateDateColumn, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";
import {ApiHideProperty, ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import User from "../users/user.entity";
import UserProject from "../users-projects/user_project.entity";

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
  readonly createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty()
  readonly updatedAt: Date;

  @OneToMany(() => UserProject, (userProject) => userProject.project)
  @ApiHideProperty()
  userProjects: UserProject[]
}
