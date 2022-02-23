import {Module} from "@nestjs/common";
import ProjectsController from "./projects.controller";
import ProjectsService from "./projects.service";
import {TypeOrmModule} from "@nestjs/typeorm";
import Project from "./project.entity";
import Language from "../languages/language.entity";
import UserProject from "../users-projects/user_project.entity";
import Invitation from "../invitations/invitation.entity";
import Group from "../groups/group.entity";
import TranslationValue from "../translation/translation_value.entity";
import TranslationKey from "../translation/translation_key.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Language,
      UserProject,
      Invitation,
      Group,
      TranslationValue,
      TranslationKey
    ])
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService]
})
export default class ProjectsModule {
}
