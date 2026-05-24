import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CertificateStatus } from '@prisma/client';
import { EventTypes } from '@lms/shared-types';
import { CertificateService } from './certificate.service';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { GeneratorService } from '../generator/generator.service';

// ── Mock factories ─────────────────────────────────────────────────────────────

const makeCert = (overrides: Record<string, unknown> = {}) => ({
  id: 'cert-1',
  tenantId: 'demo',
  userId: 'user-1',
  courseId: 'course-1',
  verifyCode: 'VERIFY-001',
  title: 'JavaScript Fundamentals',
  recipientName: 'Test User',
  description: null,
  issuerName: 'LMS Platform',
  qrCodeUrl: null,
  status: CertificateStatus.ISSUED,
  completedAt: new Date('2024-01-15'),
  expiresAt: null,
  issuedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ── Test suite ─────────────────────────────────────────────────────────────────

describe('CertificateService', () => {
  let service: CertificateService;

  const mockPrismaInner = {
    certificate: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPrisma = {
    certificate: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockOutbox = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const mockGenerator = {
    generateQrCode: jest.fn().mockResolvedValue('https://cdn.example.com/qr.png'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OutboxService, useValue: mockOutbox },
        { provide: GeneratorService, useValue: mockGenerator },
      ],
    }).compile();

    service = module.get<CertificateService>(CertificateService);
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation(
      (arg: ((tx: typeof mockPrismaInner) => unknown) | unknown[]) => {
        if (typeof arg === 'function') return arg(mockPrismaInner);
        return Promise.all(arg as Promise<unknown>[]);
      },
    );
    mockOutbox.enqueue.mockResolvedValue(undefined);
    mockGenerator.generateQrCode.mockResolvedValue('https://cdn.example.com/qr.png');
  });

  // ── issue() ───────────────────────────────────────────────────────────────────

  describe('issue()', () => {
    const baseDto = {
      userId: 'user-1',
      title: 'JavaScript Fundamentals',
      recipientName: 'Test User',
      courseId: 'course-1',
      completedAt: '2024-01-15T00:00:00.000Z',
    };

    it('returns existing certificate when same userId+courseId already ISSUED or PENDING (idempotency)', async () => {
      const existing = makeCert();
      mockPrisma.certificate.findFirst.mockResolvedValue(existing);

      const result = await service.issue(baseDto);

      expect(mockPrisma.certificate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            courseId: 'course-1',
            status: { in: [CertificateStatus.ISSUED, CertificateStatus.PENDING] },
          }),
        }),
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });

    it('creates new certificate with ISSUED status and enqueues CERTIFICATE_ISSUED event', async () => {
      mockPrisma.certificate.findFirst.mockResolvedValue(null);
      const cert = makeCert();
      mockPrismaInner.certificate.create.mockResolvedValue(cert);

      const result = await service.issue(baseDto);

      expect(mockPrismaInner.certificate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            courseId: 'course-1',
            status: CertificateStatus.ISSUED,
          }),
        }),
      );
      expect(mockOutbox.enqueue).toHaveBeenCalledWith(
        mockPrismaInner,
        expect.objectContaining({
          eventType: EventTypes.CERTIFICATE_ISSUED,
          payload: expect.objectContaining({ certificateId: cert.id, userId: 'user-1', courseId: 'course-1' }),
        }),
      );
      expect(result).toEqual(cert);
    });

    it('does NOT check for existing when courseId is omitted (non-idempotent path)', async () => {
      const cert = makeCert({ courseId: null });
      mockPrismaInner.certificate.create.mockResolvedValue(cert);

      await service.issue({
        userId: 'user-1',
        title: 'Manual Certificate',
        recipientName: 'Test User',
        completedAt: '2024-01-15T00:00:00.000Z',
      });

      expect(mockPrisma.certificate.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaInner.certificate.create).toHaveBeenCalled();
    });

    it('fires QR code generation async without blocking response', async () => {
      mockPrisma.certificate.findFirst.mockResolvedValue(null);
      const cert = makeCert();
      mockPrismaInner.certificate.create.mockResolvedValue(cert);
      mockPrisma.certificate.update.mockResolvedValue({ ...cert, qrCodeUrl: 'https://cdn.example.com/qr.png' });

      await service.issue(baseDto);

      // QR generation is fire-and-forget — generator must be called but not awaited
      await new Promise(resolve => setTimeout(resolve, 0)); // flush microtasks
      expect(mockGenerator.generateQrCode).toHaveBeenCalledWith(cert.verifyCode);
    });

    it('handles P2002 race condition: returns existing certificate on unique violation', async () => {
      mockPrisma.certificate.findFirst
        .mockResolvedValueOnce(null) // first check — no existing
        .mockResolvedValueOnce(makeCert()); // second check after P2002

      const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      mockPrisma.$transaction.mockRejectedValueOnce(p2002);

      const result = await service.issue(baseDto);

      expect(result).toEqual(expect.objectContaining({ id: 'cert-1' }));
    });
  });

  // ── verifyByCode() ────────────────────────────────────────────────────────────

  describe('verifyByCode()', () => {
    it('returns valid=true, pending=false for ISSUED certificate', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(makeCert({ status: CertificateStatus.ISSUED }));

      const result = await service.verifyByCode('VERIFY-001');

      expect(result.valid).toBe(true);
      expect(result.pending).toBe(false);
      expect(result.certificate).toBeDefined();
    });

    it('returns valid=false, pending=true for PENDING certificate', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(makeCert({ status: CertificateStatus.PENDING }));

      const result = await service.verifyByCode('VERIFY-001');

      expect(result.valid).toBe(false);
      expect(result.pending).toBe(true);
    });

    it('returns valid=false for REVOKED certificate', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(makeCert({ status: CertificateStatus.REVOKED }));

      const result = await service.verifyByCode('VERIFY-001');

      expect(result.valid).toBe(false);
      expect(result.pending).toBe(false);
      expect(result.certificate).toBeDefined();
    });

    it('throws NotFoundException for unknown verify code', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null);

      await expect(service.verifyByCode('NONEXISTENT')).rejects.toThrow(NotFoundException);
    });
  });

  // ── revoke() ──────────────────────────────────────────────────────────────────

  describe('revoke()', () => {
    it('throws NotFoundException when certificate not found', async () => {
      mockPrisma.certificate.findFirst.mockResolvedValue(null);

      await expect(service.revoke('cert-x')).rejects.toThrow(NotFoundException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('updates status to REVOKED and enqueues CERTIFICATE_REVOKED event', async () => {
      const cert = makeCert();
      mockPrisma.certificate.findFirst.mockResolvedValue(cert);
      const revoked = { ...cert, status: CertificateStatus.REVOKED };
      mockPrismaInner.certificate.update.mockResolvedValue(revoked);

      const result = await service.revoke('cert-1');

      expect(mockPrismaInner.certificate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cert-1' },
          data: { status: CertificateStatus.REVOKED },
        }),
      );
      expect(mockOutbox.enqueue).toHaveBeenCalledWith(
        mockPrismaInner,
        expect.objectContaining({
          eventType: EventTypes.CERTIFICATE_REVOKED,
          payload: expect.objectContaining({ certificateId: 'cert-1', userId: 'user-1' }),
        }),
      );
      expect(result.status).toBe(CertificateStatus.REVOKED);
    });
  });

  // ── confirm() ─────────────────────────────────────────────────────────────────

  describe('confirm()', () => {
    it('throws NotFoundException when certificate not found', async () => {
      mockPrisma.certificate.findFirst.mockResolvedValue(null);

      await expect(service.confirm('cert-x', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when non-owner tries to confirm', async () => {
      mockPrisma.certificate.findFirst.mockResolvedValue(makeCert({ userId: 'user-1', status: CertificateStatus.PENDING }));

      await expect(service.confirm('cert-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when certificate is already ISSUED', async () => {
      mockPrisma.certificate.findFirst.mockResolvedValue(makeCert({ userId: 'user-1', status: CertificateStatus.ISSUED }));

      await expect(service.confirm('cert-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when certificate is REVOKED', async () => {
      mockPrisma.certificate.findFirst.mockResolvedValue(makeCert({ userId: 'user-1', status: CertificateStatus.REVOKED }));

      await expect(service.confirm('cert-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('updates PENDING cert to ISSUED and enqueues CERTIFICATE_ISSUED event', async () => {
      const pendingCert = makeCert({ status: CertificateStatus.PENDING, userId: 'user-1' });
      mockPrisma.certificate.findFirst.mockResolvedValue(pendingCert);
      const issuedCert = { ...pendingCert, status: CertificateStatus.ISSUED };
      mockPrismaInner.certificate.update.mockResolvedValue(issuedCert);

      const result = await service.confirm('cert-1', 'user-1');

      expect(mockPrismaInner.certificate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cert-1' },
          data: { status: CertificateStatus.ISSUED },
        }),
      );
      expect(mockOutbox.enqueue).toHaveBeenCalledWith(
        mockPrismaInner,
        expect.objectContaining({ eventType: EventTypes.CERTIFICATE_ISSUED }),
      );
      expect(result.status).toBe(CertificateStatus.ISSUED);
    });
  });

  // ── findOne() ─────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('throws NotFoundException when certificate does not exist', async () => {
      mockPrisma.certificate.findFirst.mockResolvedValue(null);

      await expect(service.findOne('cert-x', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when non-owner, non-admin requests ISSUED cert', async () => {
      mockPrisma.certificate.findFirst.mockResolvedValue(makeCert({ userId: 'user-1' }));

      await expect(service.findOne('cert-1', 'user-2', false)).rejects.toThrow(ForbiddenException);
    });

    it('allows owner to access their own certificate', async () => {
      const cert = makeCert({ userId: 'user-1' });
      mockPrisma.certificate.findFirst.mockResolvedValue(cert);

      await expect(service.findOne('cert-1', 'user-1', false)).resolves.toEqual(cert);
    });

    it('allows admin to access any certificate', async () => {
      const cert = makeCert({ userId: 'user-1' });
      mockPrisma.certificate.findFirst.mockResolvedValue(cert);

      await expect(service.findOne('cert-1', 'admin-1', true)).resolves.toEqual(cert);
    });
  });
});
