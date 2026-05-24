import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async health() {
    const database = await this.prisma.healthCheck();
    if (!database) throw new ServiceUnavailableException('Database unavailable');
    return { status: 'ok', service: 'tenant-service', checks: { database: 'up' } };
  }
}
