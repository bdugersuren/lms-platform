import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckResult, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Enrollment service health check' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' as const } };
        } catch {
          return { database: { status: 'down' as const } };
        }
      },
      async () => {
        const [outboxPending, failureCount] = await Promise.all([
          this.prisma.eventOutbox.count({ where: { publishedAt: null } }),
          this.prisma.eventFailure.count({ where: { resolvedAt: null } }),
        ]);
        return { events: { status: 'up' as const, outboxPending, failureCount } };
      },
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
    ]);
  }
}
