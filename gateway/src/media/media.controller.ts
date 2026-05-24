import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { createWriteStream, createReadStream, statSync, unlinkSync } from 'fs';
import { pipeline } from 'stream/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard, RolesGuard, Roles } from '@lms/shared-auth';
import { UserRole } from '@lms/shared-types';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { MediaService } from './media.service';

const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get('presign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generate a 2-hour presigned URL for a private media object' })
  async presign(@Query('src') src: string) {
    if (!src) throw new BadRequestException('src query param is required');
    const key = this.media.parseKeyFromUrl(src);
    const presignedUrl = await this.media.presign(key);
    const expiresAt = new Date(Date.now() + 7200 * 1000).toISOString();
    return ApiResponseBuilder.success({ presignedUrl, expiresAt }, 'Presigned URL generated');
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload a file to object storage' })
  async upload(@Req() req: FastifyRequest) {
    const file = await (req as any).file({ limits: { fileSize: MAX_SIZE } });
    if (!file) throw new BadRequestException('No file provided');

    const mimeType: string = file.mimetype ?? '';
    const originalName: string = file.filename ?? 'file';

    // Write to a temp file so we can get the exact size without buffering the entire file in RAM.
    // MinIO v8 requires a non-negative size for putObject; -1 is rejected.
    const tmpPath = join(tmpdir(), `lms-upload-${randomUUID()}`);
    try {
      await pipeline(file.file, createWriteStream(tmpPath));

      if ((file.file as any).truncated) {
        throw new PayloadTooLargeException('File exceeds 500 MB limit');
      }

      const { size } = statSync(tmpPath);
      if (size === 0) throw new BadRequestException('Empty file');

      const result = await this.media.upload(createReadStream(tmpPath), originalName, mimeType, size);
      return ApiResponseBuilder.success(result, 'File uploaded successfully');
    } finally {
      try { unlinkSync(tmpPath); } catch { /* best-effort cleanup */ }
    }
  }
}
