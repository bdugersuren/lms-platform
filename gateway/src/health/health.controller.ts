import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Gateway health check' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () =>
        this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
      () =>
        this.memory.checkRSS('memory_rss', 750 * 1024 * 1024),
    ]);
  }
}
