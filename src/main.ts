import {NestFactory} from "@nestjs/core";
import {DocumentBuilder, SwaggerCustomOptions, SwaggerModule} from "@nestjs/swagger";
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
    .setDescription("Lokapp REST API - Translation management system")
    .addBearerAuth()
    .setVersion("1.0")
    .setContact("Lokapp", "https://lokapp.io/", "contact@lokapp.io")
    .build();

  const customOptions: SwaggerCustomOptions = {
    customSiteTitle: "Lokapp API Swagger"
  };

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("api/documentation", app, document, customOptions);

  customBootstrap();

  await app.listen(process.env.PORT);
}

bootstrap();
