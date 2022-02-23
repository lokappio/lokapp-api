import {TypeOrmModule} from "@nestjs/typeorm";
import {Module} from "@nestjs/common";
import ProjectsModule from "../projects/projects.module";
import Group from "./group.entity";
import GroupController from "./group.controller";
import GroupService from "./group.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Group
    ]),
    ProjectsModule
  ],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService]
})
export default class GroupModule {
}