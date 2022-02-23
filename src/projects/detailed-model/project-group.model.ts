import ProjectTranslationKey from "./project-translation-key.model";

/**
 * Group of a project.
 *
 * Used when returning the whole project content, not used in database.
 */
export default class ProjectGroup {
  id: number;
  name: string;
  keys: ProjectTranslationKey[];

  constructor(
    id: number,
    name: string,
    keys: ProjectTranslationKey[]
  ) {
    this.id = id;
    this.name = name;
    this.keys = keys;
  }
}