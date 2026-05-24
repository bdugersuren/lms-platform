import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CertificateStatus } from '@prisma/client';
import { EventTypes } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { GeneratorService } from '../generator/generator.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { QueryCertificateDto } from './dto/query-certificate.dto';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly generator: GeneratorService,
  ) {}

  async issue(dto: CreateCertificateDto, tenantId = 'demo') {
    const {
      userId,
      title,
      recipientName,
      courseId,
      description,
      issuerName,
      completedAt,
      expiresAt,
    } = dto;

    if (courseId) {
      const existing = await this.prisma.certificate.findFirst({
        where: { tenantId, userId, courseId, status: CertificateStatus.ISSUED },
      });
      if (existing) return existing;
    }

    try {
      const cert = await this.prisma.$transaction(async (tx) => {
        const created = await tx.certificate.create({
          data: {
            tenantId,
            userId,
            courseId,
            title,
            recipientName,
            description,
            issuerName: issuerName ?? 'LMS Platform',
            completedAt: new Date(completedAt),
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            status: CertificateStatus.ISSUED,
          },
        });

        await this.outbox.enqueue(tx, {
          eventId: randomUUID(),
          eventType: EventTypes.CERTIFICATE_ISSUED,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          producer: 'certificate-service',
          aggregateType: 'certificate',
          aggregateId: created.id,
          sequence: 1,
          payload: {
            certificateId: created.id,
            tenantId: created.tenantId,
            userId,
            courseId,
            verifyCode: created.verifyCode,
          },
        });

        return created;
      });

      // Generate QR code asynchronously — update record after
      this.generator
        .generateQrCode(cert.verifyCode)
        .then((qrCodeUrl) =>
          this.prisma.certificate.update({ where: { id: cert.id }, data: { qrCodeUrl } }),
        )
        .catch((err) => this.logger.warn(`QR generation failed for ${cert.id}`, err));

      this.logger.log(`Certificate issued: ${cert.id} for user ${userId}`);
      return cert;
    } catch (err: unknown) {
      // Partial unique index violation: two concurrent events raced — return the winner
      if (this.isUniqueViolation(err) && courseId) {
        this.logger.warn(
          `Duplicate cert race for userId=${userId} courseId=${courseId}, returning existing`,
        );
        const existing = await this.prisma.certificate.findFirst({
          where: { tenantId, userId, courseId, status: CertificateStatus.ISSUED },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async findAll(userId: string, query: QueryCertificateDto, tenantId = 'demo') {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const includeRevoked = query.includeRevoked === true;

    const statusFilter = includeRevoked ? undefined : { status: CertificateStatus.ISSUED };

    const where = {
      userId,
      tenantId,
      ...statusFilter,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' as const } },
              { description: { contains: query.search, mode: 'insensitive' as const } },
              { recipientName: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.certificate.findMany({
        where,
        orderBy: { issuedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.certificate.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async findOne(id: string, requestingUserId: string, isAdmin = false, tenantId = 'demo') {
    const cert = await this.prisma.certificate.findFirst({ where: { id, tenantId } });
    if (!cert) throw new NotFoundException('Certificate not found');
    // Revoked certificate-ийг owner болон admin харж болно
    if (cert.status === CertificateStatus.REVOKED && !isAdmin && cert.userId !== requestingUserId) {
      throw new NotFoundException('Certificate not found');
    }
    if (!isAdmin && cert.userId !== requestingUserId) throw new ForbiddenException('Access denied');
    return cert;
  }

  async verifyByCode(code: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { verifyCode: code } });
    if (!cert) throw new NotFoundException('Certificate not found');
    return {
      valid: cert.status === CertificateStatus.ISSUED,
      certificate: cert,
    };
  }

  async revoke(id: string, tenantId = 'demo') {
    const cert = await this.prisma.certificate.findFirst({ where: { id, tenantId } });
    if (!cert) throw new NotFoundException('Certificate not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.certificate.update({
        where: { id },
        data: { status: CertificateStatus.REVOKED },
      });

      await this.outbox.enqueue(tx, {
        eventId: randomUUID(),
        eventType: EventTypes.CERTIFICATE_REVOKED,
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        producer: 'certificate-service',
        aggregateType: 'certificate',
        aggregateId: id,
        sequence: 1,
        payload: { certificateId: id, tenantId: cert.tenantId, userId: cert.userId },
      });

      return revoked;
    });

    this.logger.log(`Certificate revoked: ${id}`);
    return updated;
  }

  private isUniqueViolation(err: unknown): boolean {
    return (err as { code?: string } | undefined)?.code === 'P2002';
  }
}
