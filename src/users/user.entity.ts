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
  readonly created_at: Date;

  @UpdateDateColumn()
  @ApiProperty()
  readonly updated_at: Date;

  constructor(id: string, username: string) {
    this.id = id;
    this.username = username;
    this.created_at = new Date();
    this.updated_at = new Date();
  }
}