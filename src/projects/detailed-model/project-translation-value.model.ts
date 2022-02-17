/**
 * Translation value.
 *
 * Used when returning the whole project content, not used in database.
 */
export default class ProjectTranslationValue {
  id: number;
  name: string;
  quantityString: string;
  languageId: number;
  languageName: string;
  keyId: number;

  constructor(
    id: number,
    name: string,
    quantityString: string,
    languageId: number,
    languageName: string,
    keyId: number
  ) {
    this.id = id;
    this.name = name;
    this.quantityString = quantityString;
    this.languageId = languageId;
    this.languageName = languageName;
    this.keyId = keyId;
  }
}