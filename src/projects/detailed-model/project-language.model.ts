/**
 * Language of a project.
 *
 * Used when returning the whole project content, not used in database.
 */
export default class ProjectLanguage {
  id: number;
  name: string;

  constructor(
    id: number,
    name: string
  ) {
    this.id = id;
    this.name = name;
  }
}