import {Module} from "@nestjs/common";
import ProjectsModule from "src/projects/projects.module";
import TranslationModule from "src/translation/translation.module";
import ImportController from "./import.controller";
import ImportService from "./import.service";

@Module({
  imports: [
    ProjectsModule,
    TranslationModule,
  ],
  controllers: [ImportController],
  providers: [ImportService],
  exports: []
})
export default class ImportModule {}
