import {Module} from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import Group from "src/groups/group.entity";
import Language from "src/languages/language.entity";
import TranslationKey from "src/translation/translation_key.entity";
import TranslationValue from "src/translation/translation_value.entity";
import UserProject from "src/users-projects/user_project.entity";
import Project from "./project.entity";
import ProjectsController from "./projects.controller";
import ProjectsService from "./projects.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Language,
      UserProject,
      Group,
      TranslationKey,
      TranslationValue,
    ])
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService]
})
export default class ProjectsModule {
}
