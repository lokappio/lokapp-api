import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, TypeOrmHealthIndicator, HealthCheck } from '@nestjs/terminus';
import {ApiOperation, ApiTags} from "@nestjs/swagger";

@Controller('health')
@ApiTags("Health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
    //Ping DB
      () => this.db.pingCheck('database'),
    ]);
  }
}
