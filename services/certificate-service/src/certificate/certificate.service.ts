import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
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

  // Admin/instructor шууд ISSUED болгож олгоно
  async issue(dto: CreateCertificateDto, tenantId = 'demo') {
    return this.createCertificate(dto, CertificateStatus.ISSUED, tenantId);
  }

  // Сургалт дуусмагц автоматаар PENDING болгоно — сурагч баталгаажуулахыг хүлээнэ
  async issuePending(dto: CreateCertificateDto, tenantId = 'demo') {
    return this.createCertificate(dto, CertificateStatus.PENDING, tenantId);
  }

  private async createCertificate(
    dto: CreateCertificateDto,
    initialStatus: CertificateStatus,
    tenantId: string,
  ) {
    const { userId, title, recipientName, courseId, description, issuerName, completedAt, expiresAt } = dto;

    if (courseId) {
      const existing = await this.prisma.certificate.findFirst({
        where: {
          tenantId,
          userId,
          courseId,
          status: { in: [CertificateStatus.ISSUED, CertificateStatus.PENDING] },
        },
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
            status: initialStatus,
          },
        });

        if (initialStatus === CertificateStatus.ISSUED) {
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
        }

        return created;
      });

      // QR код зөвхөн ISSUED cert-д үүснэ
      if (initialStatus === CertificateStatus.ISSUED) {
        this.generator
          .generateQrCode(cert.verifyCode)
          .then((qrCodeUrl) =>
            this.prisma.certificate.update({ where: { id: cert.id }, data: { qrCodeUrl } }),
          )
          .catch((err) => this.logger.warn(`QR generation failed for ${cert.id}`, err));
      }

      this.logger.log(`Certificate ${initialStatus}: ${cert.id} for user ${userId}`);
      return cert;
    } catch (err: unknown) {
      if (this.isUniqueViolation(err) && courseId) {
        this.logger.warn(`Duplicate cert race for userId=${userId} courseId=${courseId}, returning existing`);
        const existing = await this.prisma.certificate.findFirst({
          where: {
            tenantId,
            userId,
            courseId,
            status: { in: [CertificateStatus.ISSUED, CertificateStatus.PENDING] },
          },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  // Сурагч өөрийн PENDING гэрчилгээг хянаж баталгаажуулна → ISSUED болно
  async confirm(id: string, requestingUserId: string, tenantId = 'demo') {
    const cert = await this.prisma.certificate.findFirst({ where: { id, tenantId } });
    if (!cert) throw new NotFoundException('Гэрчилгээ олдсонгүй');
    if (cert.userId !== requestingUserId) throw new ForbiddenException('Зөвшөөрөл хүрэлцэхгүй');
    if (cert.status !== CertificateStatus.PENDING) {
      throw new BadRequestException(
        cert.status === CertificateStatus.ISSUED
          ? 'Гэрчилгээ аль хэдийн баталгаажсан байна'
          : 'Цуцлагдсан гэрчилгээг баталгаажуулах боломжгүй',
      );
    }

    const confirmed = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.certificate.update({
        where: { id },
        data: { status: CertificateStatus.ISSUED },
      });

      await this.outbox.enqueue(tx, {
        eventId: randomUUID(),
        eventType: EventTypes.CERTIFICATE_ISSUED,
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        producer: 'certificate-service',
        aggregateType: 'certificate',
        aggregateId: id,
        sequence: 1,
        payload: {
          certificateId: id,
          tenantId: cert.tenantId,
          userId: cert.userId,
          courseId: cert.courseId,
          verifyCode: cert.verifyCode,
        },
      });

      return updated;
    });

    // Баталгаажсаны дараа QR код үүсгэнэ
    this.generator
      .generateQrCode(cert.verifyCode)
      .then((qrCodeUrl) =>
        this.prisma.certificate.update({ where: { id: cert.id }, data: { qrCodeUrl } }),
      )
      .catch((err) => this.logger.warn(`QR generation failed for ${cert.id}`, err));

    this.logger.log(`Certificate confirmed by student: ${id}`);
    return confirmed;
  }

  async findAll(userId: string, query: QueryCertificateDto, tenantId = 'demo') {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const includeRevoked = query.includeRevoked === true;

    // PENDING болон ISSUED cert-ийг сурагчид харуулна; REVOKED нь тусдаа сонголт
    const statusFilter = includeRevoked
      ? undefined
      : { status: { in: [CertificateStatus.PENDING, CertificateStatus.ISSUED] } };

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
        orderBy: [{ status: 'asc' }, { issuedAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.certificate.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async findOne(id: string, requestingUserId: string, isAdmin = false, tenantId = 'demo') {
    const cert = await this.prisma.certificate.findFirst({ where: { id, tenantId } });
    if (!cert) throw new NotFoundException('Гэрчилгээ олдсонгүй');
    if (cert.status === CertificateStatus.REVOKED && !isAdmin && cert.userId !== requestingUserId) {
      throw new NotFoundException('Гэрчилгээ олдсонгүй');
    }
    if (!isAdmin && cert.userId !== requestingUserId) throw new ForbiddenException('Зөвшөөрөл хүрэлцэхгүй');
    return cert;
  }

  async verifyByCode(code: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { verifyCode: code } });
    if (!cert) throw new NotFoundException('Гэрчилгээ олдсонгүй');
    return {
      valid: cert.status === CertificateStatus.ISSUED,
      pending: cert.status === CertificateStatus.PENDING,
      certificate: cert,
    };
  }

  async revoke(id: string, tenantId = 'demo') {
    const cert = await this.prisma.certificate.findFirst({ where: { id, tenantId } });
    if (!cert) throw new NotFoundException('Гэрчилгээ олдсонгүй');

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
