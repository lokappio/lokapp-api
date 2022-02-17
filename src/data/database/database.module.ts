import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {ConfigModule, ConfigService} from "@nestjs/config";
import {DB_URL_CONFIG_KEY} from "../../config/constants";
import Project from "../../projects/project.entity";
import Language from "../../languages/language.entity";
import User from "../../users/user.entity";
import TranslationKey from "../../translation/translation_key.entity";
import TranslationValue from "../../translation/translation_value.entity";
import Group from "../../groups/group.entity";
import UserProject from "../../users-projects/user_project.entity";
import Invitation from "../../invitations/invitation.entity";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.get<string>(DB_URL_CONFIG_KEY),
        entities: [Project, UserProject, Invitation, Language, User, TranslationKey, TranslationValue, Group],
        synchronize: true,
        logging: ["query", "error"]
      })
    })
  ]
})
export default class DatabaseModule {
}