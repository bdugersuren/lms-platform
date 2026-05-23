import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard, RolesGuard, Roles } from '@lms/shared-auth';
import { AuditActionPayload, UserRole } from '@lms/shared-types';
import { AuditService, AuditQueryDto } from './audit.service';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check' })
  health() {
    return { status: 'ok', service: 'audit-service' };
  }

  @Post('ingest')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ingest an audit event (internal gateway use only)' })
  async ingest(@Body() payload: AuditActionPayload): Promise<void> {
    await this.audit.ingest(payload);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Query audit logs (admin only)' })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'method', required: false, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] })
  @ApiQuery({ name: 'service', required: false })
  @ApiQuery({ name: 'path', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(@Query() query: AuditQueryDto) {
    const data = await this.audit.findAll(query);
    return ApiResponseBuilder.success(data);
  }
}
