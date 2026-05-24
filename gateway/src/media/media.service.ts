import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';
import path from 'path';
import type { Readable } from 'stream';

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
  private readonly internalBase: string;
  private readonly publicStoreUrl: string;

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT ?? 'minio';
    const port = parseInt(process.env.MINIO_PORT ?? '9000', 10);
    const useSSL = process.env.MINIO_USE_SSL === 'true';

    this.client = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    });

    this.publicUrl = process.env.MINIO_PUBLIC_URL ?? 'http://localhost:9000';
    this.internalBase = `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`;
    // Presigned GET URLs are rewritten to go through nginx /minio-store/ proxy,
    // same as presigned PUT URLs. nginx forwards Host: minio:9000 so signature verification passes.
    this.publicStoreUrl = process.env.MINIO_PUBLIC_STORE_URL ?? 'http://localhost/minio-store';
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
    const raw = await this.client.presignedGetObject(BUCKET, key, 7200);
    // Replace internal Docker hostname with the public nginx proxy URL
    return raw.replace(this.internalBase, this.publicStoreUrl);
  }

  parseKeyFromUrl(rawUrl: string): string {
    // Primary: MINIO_PUBLIC_URL (e.g. http://localhost:9000)
    const publicPrefix = `${this.publicUrl}/${BUCKET}/`;
    if (rawUrl.startsWith(publicPrefix)) return rawUrl.slice(publicPrefix.length);

    // Fallback: internal Docker URL (e.g. http://minio:9000) — legacy/misconfigured records
    const internalPrefix = `${this.internalBase}/${BUCKET}/`;
    if (rawUrl.startsWith(internalPrefix)) return rawUrl.slice(internalPrefix.length);

    // Fallback: nginx proxy URL (e.g. http://localhost/minio-store)
    const proxyPrefix = `${this.publicStoreUrl}/${BUCKET}/`;
    if (rawUrl.startsWith(proxyPrefix)) return rawUrl.slice(proxyPrefix.length);

    // Bare key (no protocol prefix)
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) return rawUrl;

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
