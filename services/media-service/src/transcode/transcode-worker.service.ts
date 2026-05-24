import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { MediaStatus, TranscodeFormat, TranscodeStatus } from '@prisma/client';
import { mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { EventTypes } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { MessagingService } from '../messaging/messaging.service';

interface TranscodePayload {
  jobId: string;
  mediaFileId: string;
  sourceKey: string;
  format: TranscodeFormat;
}

interface VideoMeta {
  duration?: number;
  width?: number;
  height?: number;
}

const FORMAT_SETTINGS: Record<string, { size: string; videoBitrate: string; audioBitrate: string }> = {
  [TranscodeFormat.MP4_480P]:  { size: '854x480',  videoBitrate: '1200k', audioBitrate: '128k' },
  [TranscodeFormat.MP4_720P]:  { size: '1280x720', videoBitrate: '2500k', audioBitrate: '128k' },
  [TranscodeFormat.MP4_1080P]: { size: '1920x1080',videoBitrate: '5000k', audioBitrate: '192k' },
};

@Injectable()
export class TranscodeWorkerService {
  private readonly logger = new Logger(TranscodeWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly messaging: MessagingService,
  ) {}

  @EventPattern(EventTypes.MEDIA_TRANSCODE_QUEUED)
  async handleTranscodeQueued(@Payload() data: TranscodePayload): Promise<void> {
    const { jobId, mediaFileId, sourceKey, format } = data;
    this.logger.log(`Transcode started: job=${jobId} format=${format}`);

    const tmpDir = `/tmp/transcode-${jobId}`;
    mkdirSync(tmpDir, { recursive: true });

    try {
      await this.prisma.transcodeJob.update({
        where: { id: jobId },
        data: { status: TranscodeStatus.PROCESSING, startedAt: new Date() },
      });
      await this.prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: { status: MediaStatus.TRANSCODING },
      });

      const inputPath = join(tmpDir, 'source');
      await this.minio.downloadToFile(sourceKey, inputPath);

      const meta = await this.extractMeta(inputPath);

      let outputKey: string;
      if (format === TranscodeFormat.HLS) {
        outputKey = await this.transcodeHLS(inputPath, mediaFileId, jobId, tmpDir);
      } else if (format === TranscodeFormat.WEBM) {
        outputKey = await this.transcodeWebm(inputPath, mediaFileId, jobId, tmpDir);
      } else {
        outputKey = await this.transcodeMP4(inputPath, mediaFileId, jobId, format, tmpDir);
      }

      const outputUrl = `${this.minio['publicUrl']}/${this.minio.bucket}/${outputKey}`;

      await this.prisma.transcodeJob.update({
        where: { id: jobId },
        data: { status: TranscodeStatus.DONE, outputKey, outputUrl, completedAt: new Date() },
      });

      await this.prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          status: MediaStatus.READY,
          ...(meta.duration !== undefined && { duration: meta.duration }),
          ...(meta.width !== undefined && { width: meta.width }),
          ...(meta.height !== undefined && { height: meta.height }),
        },
      });

      this.messaging.emit(EventTypes.MEDIA_TRANSCODE_COMPLETED, { jobId, mediaFileId, format, outputKey });
      this.logger.log(`Transcode done: job=${jobId}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Transcode failed: job=${jobId}`, errorMsg);

      await this.prisma.transcodeJob.update({
        where: { id: jobId },
        data: { status: TranscodeStatus.FAILED, errorMsg },
      });
      await this.prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: { status: MediaStatus.READY },
      });

      this.messaging.emit(EventTypes.MEDIA_TRANSCODE_FAILED, { jobId, mediaFileId, format, errorMsg });
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  private extractMeta(inputPath: string): Promise<VideoMeta> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(inputPath, (err, data) => {
        if (err) { resolve({}); return; }
        const video = data.streams.find((s) => s.codec_type === 'video');
        resolve({
          duration: data.format.duration ? Math.round(data.format.duration) : undefined,
          width: video?.width,
          height: video?.height,
        });
      });
    });
  }

  private transcodeMP4(
    inputPath: string,
    mediaFileId: string,
    jobId: string,
    format: TranscodeFormat,
    tmpDir: string,
  ): Promise<string> {
    const settings = FORMAT_SETTINGS[format];
    const outputPath = join(tmpDir, 'output.mp4');
    const outputKey = `transcode/${mediaFileId}/${jobId}/output.mp4`;

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          `-vf scale=${settings.size}:force_original_aspect_ratio=decrease,pad=${settings.size}:(ow-iw)/2:(oh-ih)/2`,
          `-b:v ${settings.videoBitrate}`,
          `-b:a ${settings.audioBitrate}`,
          '-c:v libx264',
          '-c:a aac',
          '-movflags +faststart',
          '-preset fast',
        ])
        .output(outputPath)
        .on('end', async () => {
          try {
            await this.minio.uploadFile(outputPath, outputKey, 'video/mp4');
            resolve(outputKey);
          } catch (e) { reject(e); }
        })
        .on('error', reject)
        .run();
    });
  }

  private transcodeWebm(
    inputPath: string,
    mediaFileId: string,
    jobId: string,
    tmpDir: string,
  ): Promise<string> {
    const outputPath = join(tmpDir, 'output.webm');
    const outputKey = `transcode/${mediaFileId}/${jobId}/output.webm`;

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions(['-c:v libvpx-vp9', '-b:v 2000k', '-c:a libopus', '-b:a 128k'])
        .output(outputPath)
        .on('end', async () => {
          try {
            await this.minio.uploadFile(outputPath, outputKey, 'video/webm');
            resolve(outputKey);
          } catch (e) { reject(e); }
        })
        .on('error', reject)
        .run();
    });
  }

  private async transcodeHLS(
    inputPath: string,
    mediaFileId: string,
    jobId: string,
    tmpDir: string,
  ): Promise<string> {
    const hlsDir = join(tmpDir, 'hls');
    mkdirSync(hlsDir, { recursive: true });
    const playlistPath = join(hlsDir, 'index.m3u8');
    const outputKey = `transcode/${mediaFileId}/${jobId}/index.m3u8`;
    const segmentKeyPrefix = `transcode/${mediaFileId}/${jobId}`;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          '-b:v 2500k',
          '-b:a 128k',
          '-preset fast',
          '-hls_time 6',
          '-hls_list_size 0',
          '-hls_segment_filename', join(hlsDir, 'segment%03d.ts'),
          '-f hls',
        ])
        .output(playlistPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });

    // Upload all .ts segments
    const files = readdirSync(hlsDir).filter((f) => f.endsWith('.ts'));
    for (const f of files) {
      await this.minio.uploadFile(join(hlsDir, f), `${segmentKeyPrefix}/${f}`, 'video/mp2t');
    }

    // Rewrite m3u8 so segment paths are relative (standard HLS)
    let playlist = readFileSync(playlistPath, 'utf8');
    playlist = playlist.replace(/segment(\d+\.ts)/g, 'segment$1');
    writeFileSync(playlistPath, playlist, 'utf8');

    await this.minio.uploadFile(playlistPath, outputKey, 'application/x-mpegURL');
    return outputKey;
  }
}
