import {Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn} from "typeorm";
import {ApiProperty} from "@nestjs/swagger";
import {PostgresUniqueKeys} from "../data/database/postgres-unique-keys.enum";

export const UsersTableName: string = "users";

@Entity(UsersTableName)
export default class User {
  @PrimaryColumn()
  @ApiProperty()
  public id: string;

  @Column({nullable: true})
  @ApiProperty()
  public username?: string;

  @Column()
  @Index(PostgresUniqueKeys.UserEmail, {unique: true})
  public email: string;

  @CreateDateColumn()
  @ApiProperty()
  readonly createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty()
  readonly updatedAt: Date;

  constructor(id: string, username: string) {
    this.id = id;
    this.username = username;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}