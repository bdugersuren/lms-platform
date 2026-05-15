import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckResult, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Certificate service health check' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => {
        try { await this.prisma.$queryRaw`SELECT 1`; return { database: { status: 'up' as const } }; }
        catch { return { database: { status: 'down' as const } }; }
      },
      async () => {
        const ok = await this.minio.isAvailable();
        return { minio: { status: ok ? ('up' as const) : ('down' as const) } };
      },
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }
}
