import {Controller, Get} from "@nestjs/common";
import {HealthCheck, HealthCheckResult, HealthCheckService, TypeOrmHealthIndicator} from "@nestjs/terminus";
import {ApiTags} from "@nestjs/swagger";

@Controller("health")
@ApiTags("Health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator
  ) {
  }

  @Get()
  @HealthCheck()
  public check(): Promise<HealthCheckResult> {
    return this.health.check([
      //Ping DB
      () => this.db.pingCheck("database")
    ]);
  }
}
