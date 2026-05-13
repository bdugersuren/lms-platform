import {
  Controller,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard, RolesGuard, Roles } from '@lms/shared-auth';
import { UserRole } from '@lms/shared-types';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { MediaService } from './media.service';

const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload a file to object storage' })
  async upload(@Req() req: FastifyRequest) {
    const file = await (req as any).file({ limits: { fileSize: MAX_SIZE } });

    if (!file) throw new BadRequestException('No file provided');

    const mimeType: string = file.mimetype ?? '';
    const originalName: string = file.filename ?? 'file';

    // Collect stream into buffer to get size
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length > MAX_SIZE) {
      throw new PayloadTooLargeException('File exceeds 500 MB limit');
    }
    if (buffer.length === 0) throw new BadRequestException('Empty file');

    const { Readable } = await import('stream');
    const stream = Readable.from(buffer);

    const result = await this.media.upload(stream, originalName, mimeType, buffer.length);

    return ApiResponseBuilder.success(result, 'File uploaded successfully');
  }
}
