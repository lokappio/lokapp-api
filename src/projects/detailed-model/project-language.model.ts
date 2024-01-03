import {LanguageAccess} from "../../languages/language.entity";

/**
 * Language of a project.
 *
 * Used when returning the whole project content, not used in database.
 */
export default class ProjectLanguage {
  id: number;
  name: string;
  access: LanguageAccess;

  constructor(
    id: number,
    name: string,
    access: LanguageAccess
  ) {
    this.id = id;
    this.name = name;
    this.access = access;
  }
}
