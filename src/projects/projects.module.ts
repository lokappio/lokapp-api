import {Module} from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import Group from "../groups/group.entity";
import GroupModule from "../groups/group.module";
import Language from "../languages/language.entity";
import TranslationModule from "../translation/translation.module";
import TranslationKey from "../translation/translation_key.entity";
import TranslationValue from "../translation/translation_value.entity";
import UserProject from "../users-projects/user_project.entity";
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
