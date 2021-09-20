import {Module} from "@nestjs/common";
import ProjectsController from "./projects.controller";
import ProjectsService from "./projects.service";
import {TypeOrmModule} from "@nestjs/typeorm";
import Project from "./project.entity";
import Language from "../languages/language.entity";
import UserProject from "../users-projects/user_project.entity";
import Invitation from "../invitations/invitation.entity";
import Group from "../groups/group.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Language,
      UserProject,
      Invitation,
      Group
    ])
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService]
})
export default class ProjectsModule {
}
