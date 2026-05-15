import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { randomUUID } from 'crypto';
import * as path from 'path';

const SUBTITLE_MIMES = new Set(['text/vtt', 'application/x-subrip', 'text/plain']);

@Injectable()
export class SubtitleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async upload(userId: string, mediaFileId: string, file: Express.Multer.File, language: string, label: string) {
    const mediaFile = await this.prisma.mediaFile.findFirst({ where: { id: mediaFileId, userId } });
    if (!mediaFile) throw new NotFoundException('Media file not found');

    const mime = file.mimetype;
    if (!SUBTITLE_MIMES.has(mime) && !file.originalname.match(/\.(vtt|srt|txt)$/i)) {
      throw new BadRequestException('Only VTT, SRT, or TXT subtitle files are supported');
    }

    const format = file.originalname.endsWith('.srt') ? 'srt' : 'vtt';
    const ext = path.extname(file.originalname) || (format === 'srt' ? '.srt' : '.vtt');
    const key = `subtitles/${mediaFileId}/${language}-${randomUUID()}${ext}`;

    const url = await this.minio.upload(file.buffer, key, mime || 'text/vtt');

    return this.prisma.subtitle.create({
      data: { mediaFileId, language, label, key, url, format },
    });
  }

  async list(userId: string, mediaFileId: string) {
    const mediaFile = await this.prisma.mediaFile.findFirst({ where: { id: mediaFileId, userId } });
    if (!mediaFile) throw new NotFoundException('Media file not found');
    return this.prisma.subtitle.findMany({
      where: { mediaFileId },
      orderBy: { language: 'asc' },
    });
  }

  async remove(userId: string, subtitleId: string) {
    const subtitle = await this.prisma.subtitle.findUnique({
      where: { id: subtitleId },
      include: { mediaFile: true },
    });
    if (!subtitle || subtitle.mediaFile.userId !== userId) {
      throw new NotFoundException('Subtitle not found');
    }
    try { await this.minio.delete(subtitle.key); } catch { /* already gone */ }
    await this.prisma.subtitle.delete({ where: { id: subtitleId } });
  }
}
