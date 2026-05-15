import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TranscodeFormat } from '@prisma/client';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload } from '@lms/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
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
  ) {
    const data = await this.transcodeService.queue(user.sub, id, dto);
    return ApiResponseBuilder.success(data, 'Transcode job queued');
  }

  @Get('files/:id/transcode')
  @ApiOperation({ summary: 'List transcode jobs for a file' })
  async listJobs(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.transcodeService.listJobs(user.sub, id);
    return ApiResponseBuilder.success(data);
  }

  @Get('transcode-jobs/:jobId')
  @ApiOperation({ summary: 'Get a transcode job by ID' })
  async getJob(@Param('jobId', ParseUUIDPipe) jobId: string) {
    const data = await this.transcodeService.getJob(jobId);
    return ApiResponseBuilder.success(data);
  }
}
