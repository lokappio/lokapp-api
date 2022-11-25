import {forwardRef, Module} from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import Group from "src/groups/group.entity";
import GroupModule from "src/groups/group.module";
import Language from "src/languages/language.entity";
import TranslationModule from "src/translation/translation.module";
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
    ]),
    TranslationModule,
    GroupModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService]
})
export default class ProjectsModule {
}
