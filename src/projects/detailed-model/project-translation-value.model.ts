import {LanguageAccess} from "../../languages/language.entity";
import TranslationStatus from "../../translation/translation_status.enum";

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
  languageAccess: LanguageAccess;
  keyId: number;
  status: TranslationStatus;

  constructor(
    id: number,
    name: string,
    quantityString: string,
    languageId: number,
    languageName: string,
    languageAccess: LanguageAccess,
    keyId: number,
    status: TranslationStatus
  ) {
    this.id = id;
    this.name = name;
    this.quantityString = quantityString;
    this.languageId = languageId;
    this.languageName = languageName;
    this.languageAccess = languageAccess;
    this.keyId = keyId;
    this.status = status;
  }
}
