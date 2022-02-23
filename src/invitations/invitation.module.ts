import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import UsersModule from "../users/users.module";
import ProjectsModule from "../projects/projects.module";
import InvitationController from "./invitation.controller";
import Invitation from "./invitation.entity";
import InvitationService from "./invitation.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invitation
    ]),
    ProjectsModule,
    UsersModule
  ],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService]
})
export default class InvitationModule {
}