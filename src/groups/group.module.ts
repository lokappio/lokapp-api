import {Module} from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import ProjectsModule from "../projects/projects.module";
import GroupController from "./group.controller";
import Group from "./group.entity";
import GroupService from "./group.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Group]),
    ProjectsModule,
  ],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService]
})
export default class GroupModule {
}
