import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TranscodeFormat } from '@prisma/client';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload } from '@lms/shared-types';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { TranscodeService } from './transcode.service';

class TranscodeDto {
  @ApiProperty({ enum: TranscodeFormat })
  @IsEnum(TranscodeFormat)
  format: TranscodeFormat;
}

@ApiTags('Transcode')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('media')
export class TranscodeController {
  constructor(private readonly transcodeService: TranscodeService) {}

  @Post('files/:id/transcode')
  @ApiOperation({ summary: 'Queue a transcode job for a video file' })
  async queue(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TranscodeDto,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.transcodeService.queue(user.sub, id, dto, tenantId);
    return ApiResponseBuilder.success(data, 'Transcode job queued');
  }

  @Get('files/:id/transcode')
  @ApiOperation({ summary: 'List transcode jobs for a file' })
  async listJobs(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.transcodeService.listJobs(user.sub, id, tenantId);
    return ApiResponseBuilder.success(data);
  }

  @Get('transcode-jobs/:jobId')
  @ApiOperation({ summary: 'Get a transcode job by ID' })
  async getJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.transcodeService.getJob(jobId, tenantId);
    return ApiResponseBuilder.success(data);
  }
}
