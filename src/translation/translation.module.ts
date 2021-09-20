import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import TranslationController from "./translation.controller";
import TranslationKey from "./translation_key.entity";
import TranslationValue from "./translation_value.entity";
import TranslationService from "./translation.service";
import ProjectsModule from "../projects/projects.module";
import GroupModule from "../groups/group.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TranslationKey,
      TranslationValue
    ]),
    ProjectsModule,
    GroupModule
  ],
  controllers: [TranslationController],
  providers: [TranslationService]
})
export default class TranslationModule {
}