import ProjectGroup from "./project-group.model";
import ProjectLanguage from "./project-language.model";
import Language from "../../languages/language.entity";
import TranslationKey from "../../translation/translation_key.entity";
import TranslationValue from "../../translation/translation_value.entity";
import Project from "../project.entity";
import Group from "../../groups/group.entity";
import ProjectTranslationValue from "./project-translation-value.model";
import ProjectTranslationKey from "./project-translation-key.model";

/**
 * Whole content of a project.
 *
 * Project
 *   - Languages
 *   - Groups
 *      - Keys
 *        - Values
 */
export default class DetailedProject {
  id: number;
  name: string;
  color: string;
  description: string;
  languages: ProjectLanguage[];
  groups: ProjectGroup[];

  constructor(
    id: number,
    name: string,
    color: string,
    description: string,
    languages: ProjectLanguage[],
    groups: ProjectGroup[]
  ) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.description = description;
    this.languages = languages;
    this.groups = groups;
  }

  public static map(project: Project, languages: Language[], groups: Group[], keys: TranslationKey[], values: TranslationValue[]): DetailedProject {
    const projectLanguages = languages
      .sort((a, b) => (a.id > b.id) ? 1 : -1)
      .map(lang => {
        return new ProjectLanguage(lang.id, lang.name);
      });

    const projectValues = values
      .sort((a, b) => (a.id > b.id) ? 1 : -1)
      .map(val => {
        const lang = projectLanguages.find(lang => lang.id == val.languageId);
        return new ProjectTranslationValue(val.id, val.name, val.quantityString, lang.id, lang.name, val.keyId);
      });

    const projectKeys = keys
      .sort((a, b) => (a.id > b.id) ? 1 : -1)
      .map(key => {
        const keyValues = projectValues.filter(val => val.keyId == key.id);
        return new ProjectTranslationKey(key.id, key.name, keyValues, key.groupId, key.isPlural);
      });

    const projectGroups = groups
      .sort((a, b) => (a.id > b.id) ? 1 : -1)
      .map(group => {
        const groupKeys = projectKeys.filter(key => key.groupId == group.id);
        return new ProjectGroup(group.id, group.name, groupKeys);
      });

    return new DetailedProject(project.id, project.name, project.color, project.description, projectLanguages, projectGroups);
  }
}