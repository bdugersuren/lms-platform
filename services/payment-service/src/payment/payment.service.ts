import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { Decimal } from '@prisma/client/runtime/library';
import { EventTypes } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { OutboxService } from '../outbox/outbox.service';
import { QPayService } from '../qpay/qpay.service';
import { SocialPayService } from '../socialpay/socialpay.service';
import { MockPaymentService } from '../mock/mock-payment.service';
import { CreatePaymentDto, PaymentProviderDto, PaymentPurposeDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly outbox: OutboxService,
    private readonly qpay: QPayService,
    private readonly socialPay: SocialPayService,
    private readonly mockPayment: MockPaymentService,
  ) {}

  async create(userId: string, dto: CreatePaymentDto, tenantId = 'demo') {
    const purpose = dto.purpose ?? PaymentPurposeDto.COURSE_PURCHASE;
    const isTopup = purpose === PaymentPurposeDto.WALLET_TOPUP;
    const amount = new Decimal(dto.amount);

    if (!isTopup && !dto.courseId) {
      throw new BadRequestException('courseId is required for COURSE_PURCHASE');
    }
    if (amount.lessThan(1000)) {
      throw new BadRequestException('Amount must be at least 1000');
    }

    if (!isTopup) {
      const courseServiceUrl = process.env.COURSE_SERVICE_URL ?? 'http://course-service:3003';
      try {
        const resp = await axios.get(`${courseServiceUrl}/api/courses/${dto.courseId}`);
        const coursePrice = new Decimal(resp.data?.data?.price ?? '0');
        if (coursePrice.lessThanOrEqualTo(0)) {
          throw new BadRequestException('Үнэгүй хичээлд төлбөр шаардахгүй. Шууд бүртгэл хийнэ үү.');
        }
        if (!amount.equals(coursePrice)) {
          throw new BadRequestException(`Дүн буруу байна. Хичээлийн үнэ: ${coursePrice.toFixed(2)}`);
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        this.logger.warn(`Course price validation skipped: ${err.message}`);
      }
    }

    const description =
      dto.description ?? (isTopup ? 'Хэтэвч цэнэглэлт' : `Course payment — ${dto.courseId}`);

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        tenantId,
        purpose,
        courseId: isTopup ? null : dto.courseId,
        walletOwnerId: isTopup ? userId : null,
        amount,
        provider: dto.provider,
        description,
        status: 'PENDING',
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    try {
      if (dto.provider === PaymentProviderDto.WALLET) {
        const walletServiceUrl = process.env.WALLET_SERVICE_URL ?? 'http://wallet-service:3007';
        const internalSecret = process.env.INTERNAL_SERVICE_SECRET ?? 'internal-secret';
        try {
          await axios.post(
            `${walletServiceUrl}/api/wallet/internal/deduct`,
            {
              ownerId: userId,
              amount: dto.amount,
              description: description,
              reference: payment.id,
            },
            {
              headers: { 'x-internal-secret': internalSecret, 'x-tenant-id': tenantId },
              timeout: 10000,
            },
          );
        } catch (walletErr: unknown) {
          const msg =
            (walletErr as { response?: { data?: { message?: string } } })?.response?.data
              ?.message ??
            (walletErr as Error)?.message ??
            'Хэтэвч хасалт амжилтгүй';
          await this.failPayment(payment.id, payment.userId, payment, msg);
          throw new BadRequestException(msg);
        }
        return this.completePayment(payment.id);
      }

      if (dto.provider === PaymentProviderDto.MOCK) {
        const invoice = this.mockPayment.createInvoice(payment.id);
        return this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            invoiceId: invoice.invoiceId,
            expiredAt: invoice.expiredAt,
            status: 'PROCESSING',
          },
        });
      }

      if (dto.provider === PaymentProviderDto.QPAY) {
        const invoice = await this.qpay.createInvoice({
          invoiceCode: isTopup ? 'LMS_TOPUP' : 'LMS_PAYMENT',
          senderInvoiceNo: payment.id,
          invoiceReceiverCode: userId,
          amount: Number(dto.amount),
          description,
        });

        return this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            invoiceId: invoice.invoiceId,
            qrCode: invoice.qrCode,
            qrImage: invoice.qrImage,
            deepLinks: invoice.deepLinks as never,
            expiredAt: invoice.expiredAt,
            status: 'PROCESSING',
          },
        });
      }

      // SOCIAL_PAY
      const invoice = await this.socialPay.createInvoice({
        invoiceId: payment.id,
        amount: Number(dto.amount),
        description,
        returnUrl: dto.returnUrl ?? 'http://localhost/payment/result',
      });

      return this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          invoiceId: invoice.invoiceId,
          checkoutUrl: invoice.checkoutUrl,
          expiredAt: invoice.expiredAt,
          status: 'PROCESSING',
        },
      });
    } catch (err) {
      await this.failPayment(payment.id, payment.userId, payment, (err as Error)?.message);
      throw err;
    }
  }

  async findById(id: string, requesterId?: string, isAdmin = false, tenantId = 'demo') {
    const payment = await this.prisma.payment.findFirst({ where: { id, tenantId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (requesterId && !isAdmin && payment.userId !== requesterId) {
      throw new ForbiddenException('Access denied');
    }
    return payment;
  }

  async findMyPayments(userId: string, dto: QueryPaymentDto, tenantId = 'demo') {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      tenantId,
      ...(dto.status ? { status: dto.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async checkPayment(paymentId: string, requesterId?: string, tenantId = 'demo') {
    const payment = await this.findById(paymentId, requesterId, false, tenantId);

    if (payment.status === 'COMPLETED') return payment;
    if (payment.provider === 'MOCK') return payment;
    if (!payment.invoiceId) throw new BadRequestException('No invoice found for this payment');

    let paid = false;
    let externalRef: string | undefined;

    if (payment.provider === 'QPAY') {
      const result = await this.qpay.checkPayment(payment.invoiceId);
      paid = result.paid;
      externalRef = result.externalRef;
    } else {
      const result = await this.socialPay.checkPayment(payment.invoiceId);
      paid = result.paid;
      externalRef = result.externalRef;
    }

    if (paid) {
      return this.completePayment(payment.id, externalRef);
    }

    return payment;
  }

  async completePayment(paymentId: string, externalRef?: string) {
    const payment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          externalRef,
          completedAt: new Date(),
        },
      });

      await this.outbox.enqueue(tx, {
        eventId: randomUUID(),
        eventType: EventTypes.PAYMENT_CONFIRMED,
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        producer: 'payment-service',
        aggregateType: 'payment',
        aggregateId: paymentId,
        sequence: 1,
        correlationId: paymentId,
        payload: {
          paymentId: updated.id,
          tenantId: updated.tenantId,
          userId: updated.userId,
          purpose: updated.purpose,
          courseId: updated.courseId ?? undefined,
          walletOwnerId: updated.walletOwnerId ?? undefined,
          amount: updated.amount.toString(),
          currency: updated.currency,
          provider: updated.provider,
        },
      });

      return updated;
    });

    this.logger.log(`Payment completed: ${paymentId} purpose=${payment.purpose}`);
    return payment;
  }

  private async failPayment(
    paymentId: string,
    userId: string,
    payment: {
      tenantId?: string;
      courseId?: string | null;
      amount: { toString(): string };
      currency: string;
      provider: string;
      purpose: string;
    },
    reason?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
      await this.outbox.enqueue(tx, {
        eventId: randomUUID(),
        eventType: EventTypes.PAYMENT_FAILED,
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        producer: 'payment-service',
        aggregateType: 'payment',
        aggregateId: paymentId,
        sequence: 1,
        correlationId: paymentId,
        payload: {
          paymentId,
          tenantId: payment.tenantId,
          userId,
          courseId: payment.courseId ?? undefined,
          amount: payment.amount.toString(),
          currency: payment.currency,
          provider: payment.provider,
          purpose: payment.purpose as 'COURSE_PURCHASE' | 'WALLET_TOPUP',
          reason,
        },
      });
    });
    this.logger.warn(`Payment failed: ${paymentId} reason=${reason}`);
  }

  async cancelExpiredPayments(): Promise<number> {
    const result = await this.prisma.payment.updateMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        expiredAt: { lt: new Date() },
      },
      data: { status: 'CANCELLED' },
    });
    return result.count;
  }

  async findAll(dto: QueryPaymentDto, tenantId = 'demo') {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = { tenantId, ...(dto.status ? { status: dto.status } : {}) };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
