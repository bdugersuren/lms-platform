import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { CertificateStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { GeneratorService } from '../generator/generator.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { QueryCertificateDto } from './dto/query-certificate.dto';
import { ROUTING_KEYS } from '../messaging/messaging.constants';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly generator: GeneratorService,
  ) {}

  async issue(dto: CreateCertificateDto) {
    const { userId, title, recipientName, courseId, description, issuerName, completedAt, expiresAt } = dto;

    const cert = await this.prisma.certificate.create({
      data: {
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

    // Generate QR code asynchronously — update record after
    this.generator
      .generateQrCode(cert.verifyCode)
      .then((qrCodeUrl) =>
        this.prisma.certificate.update({ where: { id: cert.id }, data: { qrCodeUrl } }),
      )
      .catch((err) => this.logger.warn(`QR generation failed for ${cert.id}`, err));

    this.messaging.emit(ROUTING_KEYS.CERTIFICATE_ISSUED, {
      certificateId: cert.id,
      userId,
      courseId,
      verifyCode: cert.verifyCode,
    });

    this.logger.log(`Certificate issued: ${cert.id} for user ${userId}`);
    return cert;
  }

  async findAll(userId: string, query: QueryCertificateDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where = {
      userId,
      status: CertificateStatus.ISSUED,
      ...(query.search ? {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' as const } },
          { description: { contains: query.search, mode: 'insensitive' as const } },
          { recipientName: { contains: query.search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.certificate.findMany({ where, orderBy: { issuedAt: 'desc' }, take: limit, skip: offset }),
      this.prisma.certificate.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async findOne(id: string, requestingUserId: string, isAdmin = false) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });
    if (!cert || cert.status === CertificateStatus.REVOKED) throw new NotFoundException('Certificate not found');
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

  async revoke(id: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException('Certificate not found');
    const updated = await this.prisma.certificate.update({
      where: { id },
      data: { status: CertificateStatus.REVOKED },
    });
    this.messaging.emit(ROUTING_KEYS.CERTIFICATE_REVOKED, { certificateId: id, userId: cert.userId });
    this.logger.log(`Certificate revoked: ${id}`);
    return updated;
  }
}
