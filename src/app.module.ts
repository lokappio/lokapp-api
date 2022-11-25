import {Module} from "@nestjs/common";
import {ConfigModule, ConfigService} from "@nestjs/config";
import DatabaseModule from "./data/database/database.module";
import AuthModule from "./auth/auth.module";
import UsersModule from "./users/users.module";
import ProjectsModule from "./projects/projects.module";
import * as Joi from "@hapi/joi";
import {utilities as nestWinstonModuleUtilities, WinstonModule} from "nest-winston";
import * as winston from "winston";
import TranslationModule from "./translation/translation.module";
import GroupModule from "./groups/group.module";
import InvitationModule from "./invitations/invitation.module";
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    TerminusModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    InvitationModule,
    TranslationModule,
    GroupModule,
    DatabaseModule,
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required()
      })
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              nestWinstonModuleUtilities.format.nestLike()
            )
          })
        ]
      })
    })
  ],
  controllers: [HealthController],
})
export default class AppModule {
}
