import ProjectTranslationValue from "./project-translation-value.model";

/**
 * Translation key.
 *
 * Used when returning the whole project content, not used in database.
 */
export default class ProjectTranslationKey {
  id: number;
  name: string;
  values: ProjectTranslationValue[];
  groupId: number;
  isPlural: boolean;

  constructor(
    id: number,
    name: string,
    values: ProjectTranslationValue[],
    groupId: number,
    isPlural: boolean
  ) {
    this.id = id;
    this.name = name;
    this.values = values;
    this.groupId = groupId;
    this.isPlural = isPlural
  }
}