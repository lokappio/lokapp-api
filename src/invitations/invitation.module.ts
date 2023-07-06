import {Module} from "@nestjs/common";
import UsersModule from "../users/users.module";
import ProjectsModule from "../projects/projects.module";
import InvitationController from "./invitation.controller";
import InvitationService from "./invitation.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import Invitation from "./invitation.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation]),
    ProjectsModule,
    UsersModule
  ],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService]
})
export default class InvitationModule {
}
