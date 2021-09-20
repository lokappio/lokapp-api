import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {SnakeNamingStrategy} from "typeorm-naming-strategies";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      synchronize: true,
      dropSchema: true,
      entities: ["./src/**/*.entity.{js,ts}"],
      namingStrategy: new SnakeNamingStrategy()
    })
  ]
})
export default class TestDatabaseModule {
}