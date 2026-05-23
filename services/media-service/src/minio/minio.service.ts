import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { MediaType } from '@prisma/client';

export const MIME_TO_MEDIA_TYPE: Record<string, MediaType> = {
  'video/mp4': MediaType.VIDEO,
  'video/webm': MediaType.VIDEO,
  'video/ogg': MediaType.VIDEO,
  'video/quicktime': MediaType.VIDEO,
  'audio/mpeg': MediaType.AUDIO,
  'audio/ogg': MediaType.AUDIO,
  'audio/wav': MediaType.AUDIO,
  'audio/aac': MediaType.AUDIO,
  'image/jpeg': MediaType.IMAGE,
  'image/png': MediaType.IMAGE,
  'image/webp': MediaType.IMAGE,
  'image/gif': MediaType.IMAGE,
  'image/svg+xml': MediaType.IMAGE,
  'application/pdf': MediaType.PDF,
  'text/vtt': MediaType.OTHER,
  'application/x-subrip': MediaType.OTHER,
};

const FOLDER_MAP: Record<MediaType, string> = {
  [MediaType.VIDEO]: 'videos',
  [MediaType.AUDIO]: 'audio',
  [MediaType.IMAGE]: 'images',
  [MediaType.PDF]: 'pdfs',
  [MediaType.DOCUMENT]: 'documents',
  [MediaType.OTHER]: 'other',
};

export interface UploadResult {
  key: string;
  url: string;
  mediaType: MediaType;
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Minio.Client;
  readonly bucket: string;
  private readonly publicUrl: string;
  readonly presignExpires: number;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('MINIO_BUCKET', 'lms-media');
    this.publicUrl = config.get<string>('MINIO_PUBLIC_URL', 'http://localhost:9000');
    this.presignExpires = config.get<number>('PRESIGN_EXPIRES_SECONDS', 7200);

    this.client = new Minio.Client({
      endPoint: config.get<string>('MINIO_ENDPOINT', 'minio'),
      port: config.get<number>('MINIO_PORT', 9000),
      useSSL: config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`Bucket '${this.bucket}' created`);
      }
    } catch (err) {
      this.logger.error('MinIO init failed', err);
    }
  }

  resolveMediaType(mimeType: string): MediaType {
    return MIME_TO_MEDIA_TYPE[mimeType] ?? MediaType.OTHER;
  }

  buildKey(mimeType: string, originalName: string): string {
    const mediaType = this.resolveMediaType(mimeType);
    const folder = FOLDER_MAP[mediaType];
    const ext = path.extname(originalName) || '';
    return `${folder}/${randomUUID()}${ext}`;
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const stream = Readable.from(buffer);
    await this.client.putObject(this.bucket, key, stream, buffer.length, {
      'Content-Type': mimeType,
    });
    return `${this.publicUrl}/${this.bucket}/${key}`;
  }

  async uploadStream(stream: Readable, key: string, size: number, mimeType: string): Promise<string> {
    await this.client.putObject(this.bucket, key, stream, size, {
      'Content-Type': mimeType,
    });
    return `${this.publicUrl}/${this.bucket}/${key}`;
  }

  async presign(key: string): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, this.presignExpires);
  }

  async presignedPutObject(key: string, expiresSeconds?: number): Promise<string> {
    const expires = expiresSeconds ?? this.presignExpires;
    return this.client.presignedPutObject(this.bucket, key, expires);
  }

  async downloadToFile(key: string, destPath: string): Promise<void> {
    const stream = await this.client.getObject(this.bucket, key);
    await pipeline(stream as Readable, createWriteStream(destPath));
  }

  async uploadFile(srcPath: string, key: string, mimeType: string): Promise<string> {
    const { createReadStream, statSync } = await import('fs');
    const { size } = statSync(srcPath);
    const stream = createReadStream(srcPath);
    await this.client.putObject(this.bucket, key, stream, size, { 'Content-Type': mimeType });
    return `${this.publicUrl}/${this.bucket}/${key}`;
  }

  async uploadBuffer(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const stream = Readable.from(buffer);
    await this.client.putObject(this.bucket, key, stream, buffer.length, { 'Content-Type': mimeType });
    return `${this.publicUrl}/${this.bucket}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.bucketExists(this.bucket);
      return true;
    } catch {
      return false;
    }
  }

  parseKeyFromUrl(rawUrl: string): string {
    const prefix = `${this.publicUrl}/${this.bucket}/`;
    if (rawUrl.startsWith(prefix)) return rawUrl.slice(prefix.length);
    if (!rawUrl.startsWith('http')) return rawUrl;
    throw new BadRequestException(`Cannot resolve object key from URL: ${rawUrl}`);
  }
}
