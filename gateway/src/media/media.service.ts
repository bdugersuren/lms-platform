import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';
import path from 'path';
import { Readable } from 'stream';

const BUCKET = 'lms-media';

const ALLOWED_MIME: Record<string, string> = {
  'video/mp4': 'videos',
  'video/webm': 'videos',
  'video/ogg': 'videos',
  'application/pdf': 'pdfs',
  'image/jpeg': 'images',
  'image/png': 'images',
  'image/webp': 'images',
  'image/gif': 'images',
  'audio/mpeg': 'audio',
  'audio/ogg': 'audio',
  'audio/wav': 'audio',
};

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private readonly client: Minio.Client;
  private readonly publicUrl: string;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT ?? 'minio',
      port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    });
    this.publicUrl = process.env.MINIO_PUBLIC_URL ?? 'http://localhost:9000';
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(BUCKET);
      if (!exists) {
        await this.client.makeBucket(BUCKET, 'us-east-1');
        this.logger.log(`Bucket '${BUCKET}' created (private — presigned URLs required)`);
      }
    } catch (err) {
      this.logger.error('Failed to initialise MinIO bucket', err);
    }
  }

  async presign(key: string): Promise<string> {
    return this.client.presignedGetObject(BUCKET, key, 7200); // 2 hours
  }

  parseKeyFromUrl(rawUrl: string): string {
    const bucketPrefix = `${this.publicUrl}/${BUCKET}/`;
    if (rawUrl.startsWith(bucketPrefix)) {
      return rawUrl.slice(bucketPrefix.length);
    }
    // Already a bare key (e.g. "videos/abc.mp4")
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      return rawUrl;
    }
    throw new BadRequestException(`Cannot resolve object key from URL: ${rawUrl}`);
  }

  async upload(
    stream: Readable,
    originalName: string,
    mimeType: string,
    size: number,
  ): Promise<{ url: string; key: string; mimeType: string; size: number }> {
    const folder = ALLOWED_MIME[mimeType];
    if (!folder) throw new Error(`Unsupported file type: ${mimeType}`);

    const ext = path.extname(originalName) || '';
    const key = `${folder}/${randomUUID()}${ext}`;

    await this.client.putObject(BUCKET, key, stream, size, { 'Content-Type': mimeType });

    return {
      url: `${this.publicUrl}/${BUCKET}/${key}`,
      key,
      mimeType,
      size,
    };
  }
}
