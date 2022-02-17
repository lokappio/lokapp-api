import {ApiProperty} from "@nestjs/swagger";
import Language from "../languages/language.entity";
import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn} from "typeorm";
import TranslationKey from "./translation_key.entity";
import {PostgresUniqueKeys} from "../data/database/postgres-unique-keys.enum";

export const TranslationValuesTableName: string = "translation_values";

@Entity(TranslationValuesTableName)
@Unique(PostgresUniqueKeys.TranslationValueInProject, ["key", "quantityString", "language"])
export default class TranslationValue {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  readonly id: number;

  @Column()
  @ApiProperty()
  public name: string;

  @Column({nullable: true})
  @ApiProperty()
  public quantityString: string;

  @CreateDateColumn()
  @ApiProperty()
  readonly createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty()
  readonly updatedAt: Date;

  @Column("int", {nullable: false})
  keyId: number;

  @Column("int", {nullable: false})
  languageId: number;

  @ManyToOne(() => TranslationKey, {onDelete: "CASCADE"})
  @JoinColumn({name: "keyId"})
  public key: TranslationKey;

  @ManyToOne(() => Language, {onDelete: "CASCADE"})
  @JoinColumn({name: "languageId"})
  public language: Language;
}