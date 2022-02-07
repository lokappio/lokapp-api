import {NestFactory} from "@nestjs/core";
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import AppModule from "./app.module";
import {WINSTON_MODULE_NEST_PROVIDER} from "nest-winston";
import {HttpExceptionFilter} from "./common/http-error.filter";
import {QueryExceptionFilter} from "./common/query-error.filter";
import {customBootstrap} from "./bootstrap/custom-bootstrap";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.enableCors();

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new QueryExceptionFilter()
  );

  const options = new DocumentBuilder()
    .setTitle("Lokapp API")
    .setDescription("Lokapp API description")
    .addBearerAuth()
    .setVersion("1.0")
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("api/documentation", app, document);

  customBootstrap();

  await app.listen(8081);
}

bootstrap();
