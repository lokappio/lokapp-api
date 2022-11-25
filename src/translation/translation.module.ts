import {Module} from "@nestjs/common";
import TranslationController from "./translation.controller";
import TranslationService from "./translation.service";
import ProjectsModule from "../projects/projects.module";
import GroupModule from "../groups/group.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import TranslationKey from "./translation_key.entity";
import TranslationValue from "./translation_value.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TranslationKey,
      TranslationValue,
    ]),
    ProjectsModule,
    GroupModule
  ],
  controllers: [TranslationController],
  providers: [TranslationService],
  exports: [TranslationService]
})
export default class TranslationModule {
}
