import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard, RolesGuard, Roles } from '@lms/shared-auth';
import { UserRole } from '@lms/shared-types';
import { AiLogsService, AiLogQueryDto } from './ai-logs.service';

@ApiTags('AI Logs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('ai/logs')
export class AiLogsController {
  constructor(private readonly aiLogs: AiLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Query AI interaction logs (admin only)' })
  async findAll(@Query() query: AiLogQueryDto) {
    const data = await this.aiLogs.findAll(query);
    return ApiResponseBuilder.success(data);
  }
}
