import {ApiHideProperty, ApiProperty} from "@nestjs/swagger";
import Language from "../languages/language.entity";
import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn} from "typeorm";
import TranslationKey from "./translation_key.entity";
import {PostgresUniqueKeys} from "../data/database/postgres-unique-keys.enum";
import TranslationStatus from "./translation_status.enum";

export const TranslationValuesTableName: string = "translation_values";

@Entity(TranslationValuesTableName)
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
  @ApiProperty()
  keyId: number;

  @Column("int", {nullable: false})
  @ApiProperty()
  languageId: number;

  @ManyToOne(() => TranslationKey, {onDelete: "CASCADE"})
  @JoinColumn({name: "keyId"})
  @ApiHideProperty()
  public key: TranslationKey;

  @ManyToOne(() => Language, {onDelete: "CASCADE"})
  @JoinColumn({name: "languageId"})
  @ApiHideProperty()
  public language: Language;

  @Column({default: TranslationStatus.MODIFIED, nullable: false})
  @ApiProperty()
  public status: TranslationStatus;
}
