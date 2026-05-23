import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { EventTypes } from '@lms/shared-types';
import { MessagingService } from '../messaging/messaging.service';
import { UpdateMediaDto } from './dto/update-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { PresignUploadDto } from './dto/presign-upload.dto';

const ALLOWED_MIME = new Set([
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  'application/pdf',
]);

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly maxSizeBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly messaging: MessagingService,
    private readonly config: ConfigService,
  ) {
    this.maxSizeBytes = config.get<number>('UPLOAD_MAX_SIZE_MB', 500) * 1024 * 1024;
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  async upload(userId: string, file: Express.Multer.File) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    if (file.size > this.maxSizeBytes) {
      throw new BadRequestException(`File exceeds ${this.config.get('UPLOAD_MAX_SIZE_MB', 500)}MB limit`);
    }
    if (file.size === 0) throw new BadRequestException('Empty file');

    const mediaType = this.minio.resolveMediaType(file.mimetype);
    const key = this.minio.buildKey(file.mimetype, file.originalname);
    const url = await this.minio.upload(file.buffer, key, file.mimetype);

    const record = await this.prisma.mediaFile.create({
      data: {
        userId,
        key,
        url,
        originalName: file.originalname,
        mimeType: file.mimetype,
        mediaType,
        size: BigInt(file.size),
        status: MediaStatus.READY,
        title: file.originalname,
      },
    });

    this.messaging.emit(EventTypes.MEDIA_FILE_UPLOADED, {
      mediaFileId: record.id,
      userId,
      mediaType,
      key,
    });

    this.logger.log(`Uploaded ${key} for user ${userId}`);
    return this.serialize(record);
  }

  // ─── Presigned upload (browser → MinIO directly) ─────────────────────────

  async createPresignedUpload(userId: string, dto: PresignUploadDto) {
    if (!ALLOWED_MIME.has(dto.mimeType)) {
      throw new BadRequestException(`Unsupported file type: ${dto.mimeType}`);
    }
    if (dto.size > this.maxSizeBytes) {
      throw new BadRequestException(`File exceeds ${this.config.get('UPLOAD_MAX_SIZE_MB', 500)}MB limit`);
    }

    const mediaType = this.minio.resolveMediaType(dto.mimeType);
    const key = this.minio.buildKey(dto.mimeType, dto.filename);
    const uploadUrl = await this.minio.presignedPutObject(key);

    const record = await this.prisma.mediaFile.create({
      data: {
        userId,
        key,
        url: `${this.minio['publicUrl']}/${this.minio.bucket}/${key}`,
        originalName: dto.filename,
        mimeType: dto.mimeType,
        mediaType,
        size: BigInt(dto.size),
        status: MediaStatus.UPLOADING,
        title: dto.filename,
      },
    });

    const expiresAt = new Date(Date.now() + this.minio.presignExpires * 1000).toISOString();
    this.logger.log(`Presigned upload created: key=${key} user=${userId}`);
    return { uploadUrl, key, mediaFileId: record.id, expiresAt };
  }

  async finalizeUpload(userId: string, key: string) {
    const record = await this.prisma.mediaFile.findFirst({
      where: { key, userId, status: MediaStatus.UPLOADING },
    });
    if (!record) throw new NotFoundException('Pending upload not found');

    const updated = await this.prisma.mediaFile.update({
      where: { id: record.id },
      data: { status: MediaStatus.READY },
    });

    this.messaging.emit(EventTypes.MEDIA_FILE_UPLOADED, {
      mediaFileId: record.id,
      userId,
      mediaType: record.mediaType,
      key,
    });

    this.logger.log(`Finalized upload: key=${key} user=${userId}`);
    return this.serialize(updated);
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  async findAll(userId: string, query: QueryMediaDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const where = {
      userId,
      status: { not: MediaStatus.DELETED },
      ...(query.mediaType ? { mediaType: query.mediaType } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' as const } },
              { originalName: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mediaFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { _count: { select: { subtitles: true, transcodeJobs: true } } },
      }),
      this.prisma.mediaFile.count({ where }),
    ]);

    return { items: items.map(this.serialize), total, limit, offset };
  }

  // ─── Get one ──────────────────────────────────────────────────────────────

  async findOne(userId: string, id: string) {
    const file = await this.prisma.mediaFile.findFirst({
      where: { id, userId, status: { not: MediaStatus.DELETED } },
      include: { subtitles: true, transcodeJobs: { orderBy: { createdAt: 'desc' } } },
    });
    if (!file) throw new NotFoundException('Media file not found');
    return this.serialize(file);
  }

  // ─── Update metadata ─────────────────────────────────────────────────────

  async update(userId: string, id: string, dto: UpdateMediaDto) {
    await this.findOne(userId, id);
    const updated = await this.prisma.mediaFile.update({
      where: { id },
      data: dto,
    });
    return this.serialize(updated);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async remove(userId: string, id: string) {
    const file = await this.findOne(userId, id);
    try {
      await this.minio.delete(file.key);
    } catch (err) {
      this.logger.warn(`MinIO delete failed for ${file.key}`, err);
    }
    await this.prisma.mediaFile.update({
      where: { id },
      data: { status: MediaStatus.DELETED },
    });
    this.messaging.emit(EventTypes.MEDIA_FILE_DELETED, { mediaFileId: id, userId });
  }

  // ─── Presign ──────────────────────────────────────────────────────────────

  async presign(rawUrl: string) {
    const key = this.minio.parseKeyFromUrl(rawUrl);
    const presignedUrl = await this.minio.presign(key);
    const expiresAt = new Date(Date.now() + this.minio.presignExpires * 1000).toISOString();
    return { presignedUrl, expiresAt };
  }

  // ─── Serialize (BigInt → number) ──────────────────────────────────────────

  private serialize<T extends { size: bigint | number | null }>(record: T): Omit<T, 'size'> & { size: number | null } {
    return {
      ...record,
      size: typeof record.size === 'bigint' ? Number(record.size) : (record.size as number | null),
    };
  }
}
