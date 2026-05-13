import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';
import path from 'path';

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
        const policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET}/*`],
          }],
        });
        await this.client.setBucketPolicy(BUCKET, policy);
        this.logger.log(`Bucket '${BUCKET}' created with public read policy`);
      }
    } catch (err) {
      this.logger.error('Failed to initialise MinIO bucket', err);
    }
  }

  async upload(
    stream: NodeJS.ReadableStream,
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
