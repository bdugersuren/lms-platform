import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { EventTypes } from '@lms/shared-types';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { OutboxService } from '../outbox/outbox.service';
import { QPayService } from '../qpay/qpay.service';
import { SocialPayService } from '../socialpay/socialpay.service';
import { MockPaymentService } from '../mock/mock-payment.service';

jest.mock('axios');
import axios from 'axios';
const mockAxios = axios as jest.Mocked<typeof axios>;

// ── Mock factories ─────────────────────────────────────────────────────────────

const makePayment = (overrides: Record<string, unknown> = {}) => ({
  id: 'pay-1',
  userId: 'user-1',
  tenantId: 'demo',
  purpose: 'COURSE_PURCHASE',
  courseId: 'course-1',
  walletOwnerId: null,
  amount: new Decimal('5000'),
  currency: 'MNT',
  provider: 'MOCK',
  description: 'Course payment — course-1',
  status: 'PENDING',
  invoiceId: null,
  qrCode: null,
  qrImage: null,
  deepLinks: [],
  checkoutUrl: null,
  externalRef: null,
  expiredAt: new Date(Date.now() + 30 * 60 * 1000),
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeMockInvoice = (paymentId = 'pay-1') => ({
  invoiceId: `mock-${paymentId}`,
  qrCode: null,
  qrImage: null,
  deepLinks: [],
  checkoutUrl: null,
  expiredAt: new Date(Date.now() + 30 * 60 * 1000),
});

// ── Test suite ─────────────────────────────────────────────────────────────────

describe('PaymentService', () => {
  let service: PaymentService;

  const mockPrismaInner = {
    payment: { update: jest.fn() },
  };

  const mockPrisma = {
    payment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: typeof mockPrismaInner) => unknown) => fn(mockPrismaInner)),
  };

  const mockOutbox = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const mockQpay = { createInvoice: jest.fn(), checkPayment: jest.fn() };
  const mockSocialPay = { createInvoice: jest.fn(), checkPayment: jest.fn() };
  const mockMockPayment = { createInvoice: jest.fn(), checkPayment: jest.fn() };
  const mockMessaging = { publishEvent: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MessagingService, useValue: mockMessaging },
        { provide: OutboxService, useValue: mockOutbox },
        { provide: QPayService, useValue: mockQpay },
        { provide: SocialPayService, useValue: mockSocialPay },
        { provide: MockPaymentService, useValue: mockMockPayment },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: typeof mockPrismaInner) => unknown) => fn(mockPrismaInner),
    );
    mockOutbox.enqueue.mockResolvedValue(undefined);
  });

  // ── create() ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('throws BadRequestException when COURSE_PURCHASE has no courseId', async () => {
      await expect(
        service.create('user-1', { amount: 5000, provider: 'MOCK' as any, purpose: 'COURSE_PURCHASE' as any }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when amount < 1000', async () => {
      await expect(
        service.create('user-1', { amount: 999, provider: 'MOCK' as any, courseId: 'course-1' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('creates PENDING record then updates to PROCESSING for MOCK provider', async () => {
      const payment = makePayment();
      mockPrisma.payment.create.mockResolvedValue(payment);
      const invoice = makeMockInvoice(payment.id);
      mockMockPayment.createInvoice.mockReturnValue(invoice);
      const processing = { ...payment, status: 'PROCESSING', invoiceId: invoice.invoiceId };
      mockPrisma.payment.update.mockResolvedValue(processing);

      const result = await service.create('user-1', {
        amount: 5000,
        provider: 'MOCK' as any,
        courseId: 'course-1',
      });

      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING', courseId: 'course-1', userId: 'user-1' }),
        }),
      );
      expect(mockMockPayment.createInvoice).toHaveBeenCalledWith(payment.id);
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: payment.id },
          data: expect.objectContaining({ status: 'PROCESSING', invoiceId: invoice.invoiceId }),
        }),
      );
      expect(result.status).toBe('PROCESSING');
    });

    it('WALLET provider calls axios.post to wallet-service and then completes payment', async () => {
      const payment = makePayment({ provider: 'WALLET' });
      mockPrisma.payment.create.mockResolvedValue(payment);
      mockAxios.post.mockResolvedValue({ data: { success: true } });
      const completed = { ...payment, status: 'COMPLETED' };
      mockPrismaInner.payment.update.mockResolvedValue(completed);

      const result = await service.create('user-1', {
        amount: 5000,
        provider: 'WALLET' as any,
        courseId: 'course-1',
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/wallet/internal/deduct'),
        expect.objectContaining({ ownerId: 'user-1', amount: 5000, reference: payment.id }),
        expect.objectContaining({ headers: expect.objectContaining({ 'x-internal-secret': expect.any(String) }) }),
      );
      expect(mockOutbox.enqueue).toHaveBeenCalledWith(
        mockPrismaInner,
        expect.objectContaining({ eventType: EventTypes.PAYMENT_CONFIRMED }),
      );
      expect(result.status).toBe('COMPLETED');
    });

    it('WALLET provider: fails payment and throws BadRequestException when axios.post fails', async () => {
      const payment = makePayment({ provider: 'WALLET' });
      mockPrisma.payment.create.mockResolvedValue(payment);
      mockAxios.post.mockRejectedValue(
        Object.assign(new Error('Insufficient balance'), {
          response: { data: { message: 'Insufficient balance' } },
        }),
      );
      mockPrismaInner.payment.update.mockResolvedValue({ ...payment, status: 'FAILED' });

      await expect(
        service.create('user-1', { amount: 5000, provider: 'WALLET' as any, courseId: 'course-1' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockOutbox.enqueue).toHaveBeenCalledWith(
        mockPrismaInner,
        expect.objectContaining({ eventType: EventTypes.PAYMENT_FAILED }),
      );
    });

    it('WALLET_TOPUP does not require courseId', async () => {
      const payment = makePayment({ purpose: 'WALLET_TOPUP', courseId: null, walletOwnerId: 'user-1', provider: 'WALLET' });
      mockPrisma.payment.create.mockResolvedValue(payment);
      mockAxios.post.mockResolvedValue({ data: { success: true } });
      const completed = { ...payment, status: 'COMPLETED' };
      mockPrismaInner.payment.update.mockResolvedValue(completed);

      await expect(
        service.create('user-1', { amount: 5000, provider: 'WALLET' as any, purpose: 'WALLET_TOPUP' as any }),
      ).resolves.toBeDefined();
    });
  });

  // ── completePayment() ─────────────────────────────────────────────────────────

  describe('completePayment()', () => {
    it('updates status to COMPLETED and enqueues PAYMENT_CONFIRMED event', async () => {
      const completed = makePayment({ status: 'COMPLETED', completedAt: new Date() });
      mockPrismaInner.payment.update.mockResolvedValue(completed);

      const result = await service.completePayment('pay-1');

      expect(mockPrismaInner.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
      expect(mockOutbox.enqueue).toHaveBeenCalledWith(
        mockPrismaInner,
        expect.objectContaining({
          eventType: EventTypes.PAYMENT_CONFIRMED,
          payload: expect.objectContaining({ paymentId: 'pay-1', userId: 'user-1' }),
        }),
      );
      expect(result.status).toBe('COMPLETED');
    });

    it('passes externalRef when provided', async () => {
      const completed = makePayment({ status: 'COMPLETED', externalRef: 'ext-ref-1' });
      mockPrismaInner.payment.update.mockResolvedValue(completed);

      await service.completePayment('pay-1', 'ext-ref-1');

      expect(mockPrismaInner.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ externalRef: 'ext-ref-1' }),
        }),
      );
    });

    it('payload includes amount as string (not Decimal)', async () => {
      const completed = makePayment({ status: 'COMPLETED', amount: new Decimal('5000') });
      mockPrismaInner.payment.update.mockResolvedValue(completed);

      await service.completePayment('pay-1');

      expect(mockOutbox.enqueue).toHaveBeenCalledWith(
        mockPrismaInner,
        expect.objectContaining({
          payload: expect.objectContaining({ amount: '5000' }),
        }),
      );
    });
  });

  // ── cancelExpiredPayments() ───────────────────────────────────────────────────

  describe('cancelExpiredPayments()', () => {
    it('cancels PENDING and PROCESSING payments past expiredAt and returns count', async () => {
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 4 });

      const count = await service.cancelExpiredPayments();

      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] },
          expiredAt: { lt: expect.any(Date) },
        },
        data: { status: 'CANCELLED' },
      });
      expect(count).toBe(4);
    });

    it('returns 0 when no payments are expired', async () => {
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 });

      const count = await service.cancelExpiredPayments();

      expect(count).toBe(0);
    });
  });

  // ── findById() ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('throws NotFoundException when payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.findById('pay-x')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not the owner', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(makePayment({ userId: 'user-1' }));

      await expect(service.findById('pay-1', 'user-2', false)).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to access any payment', async () => {
      const payment = makePayment({ userId: 'user-1' });
      mockPrisma.payment.findFirst.mockResolvedValue(payment);

      await expect(service.findById('pay-1', 'admin-1', true)).resolves.toEqual(payment);
    });
  });
});
