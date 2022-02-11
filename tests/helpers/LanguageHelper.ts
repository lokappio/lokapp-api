import Language from "../../src/languages/language.entity";
import {Repository} from "typeorm";


export default class LanguageHelper {
  public static async dbAddLanguage(languageRepository: Repository<Language>, language: Language): Promise<Language> {
    return await languageRepository.save(language);
  }
}