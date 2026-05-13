import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Auth service health check' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => {
        const isDbHealthy = await this.prisma.healthCheck();
        return {
          database: {
            status: isDbHealthy ? 'up' : 'down',
          },
        };
      },
      async () => {
        const isRedisHealthy = await this.redis.ping();
        return {
          redis: {
            status: isRedisHealthy ? 'up' : 'down',
          },
        };
      },
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
    ]);
  }
}
