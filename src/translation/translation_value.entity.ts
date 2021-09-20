import {ApiProperty} from "@nestjs/swagger";
import Language from "../languages/language.entity";
import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn} from "typeorm";
import TranslationKey from "./translation_key.entity";
import {PostgresUniqueKeys} from "../data/database/postgres-unique-keys.enum";

export const TranslationValuesTableName: string = "translation_values";

@Entity(TranslationValuesTableName)
@Unique(PostgresUniqueKeys.TranslationValueInProject, ["key", "quantity_string", "language"])
export default class TranslationValue {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  readonly id: number;

  @Column()
  @ApiProperty()
  public name: string;

  @Column({nullable: true})
  @ApiProperty()
  public quantity_string: string;

  @CreateDateColumn()
  @ApiProperty()
  readonly created_at: Date;

  @UpdateDateColumn()
  @ApiProperty()
  readonly updated_at: Date;

  @Column("int", {nullable: false})
  key_id: number;

  @Column("int", {nullable: false})
  language_id: number;

  @ManyToOne(() => TranslationKey, {onDelete: "CASCADE"})
  @JoinColumn({name: "key_id"})
  public key: TranslationKey;

  @ManyToOne(() => Language, {onDelete: "CASCADE"})
  @JoinColumn({name: "language_id"})
  public language: Language;
}