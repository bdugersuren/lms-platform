import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TranscodeFormat, TranscodeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';

export class CreateTranscodeDto {
  format: TranscodeFormat;
}

@Injectable()
export class TranscodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  async queue(userId: string, mediaFileId: string, dto: CreateTranscodeDto) {
    const file = await this.prisma.mediaFile.findFirst({
      where: { id: mediaFileId, userId },
    });
    if (!file) throw new NotFoundException('Media file not found');
    if (file.mediaType !== 'VIDEO') {
      throw new BadRequestException('Transcoding is only supported for video files');
    }

    const existing = await this.prisma.transcodeJob.findFirst({
      where: { mediaFileId, format: dto.format, status: { in: [TranscodeStatus.PENDING, TranscodeStatus.PROCESSING] } },
    });
    if (existing) throw new BadRequestException('A transcode job with this format is already queued');

    const job = await this.prisma.transcodeJob.create({
      data: { mediaFileId, format: dto.format, status: TranscodeStatus.PENDING },
    });

    // Emit event — a separate worker process would pick this up and run FFmpeg
    this.messaging.emit('media.transcode.queued', {
      jobId: job.id,
      mediaFileId,
      sourceKey: file.key,
      format: dto.format,
    });

    return job;
  }

  async getJob(jobId: string) {
    const job = await this.prisma.transcodeJob.findUnique({
      where: { id: jobId },
      include: { mediaFile: { select: { id: true, title: true, originalName: true } } },
    });
    if (!job) throw new NotFoundException('Transcode job not found');
    return job;
  }

  async listJobs(userId: string, mediaFileId: string) {
    const file = await this.prisma.mediaFile.findFirst({ where: { id: mediaFileId, userId } });
    if (!file) throw new NotFoundException('Media file not found');
    return this.prisma.transcodeJob.findMany({
      where: { mediaFileId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
