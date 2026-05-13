import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { QPayService } from '../qpay/qpay.service';
import { SocialPayService } from '../socialpay/socialpay.service';
import { CreatePaymentDto, PaymentProviderDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly qpay: QPayService,
    private readonly socialPay: SocialPayService,
  ) {}

  async create(userId: string, dto: CreatePaymentDto) {
    const description = dto.description ?? `Course payment — ${dto.courseId}`;

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        courseId: dto.courseId,
        amount: new Decimal(dto.amount),
        provider: dto.provider,
        description,
        status: 'PENDING',
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    try {
      if (dto.provider === PaymentProviderDto.QPAY) {
        const invoice = await this.qpay.createInvoice({
          invoiceCode: 'LMS_PAYMENT',
          senderInvoiceNo: payment.id,
          invoiceReceiverCode: userId,
          amount: dto.amount,
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
      } else {
        // SOCIAL_PAY
        const invoice = await this.socialPay.createInvoice({
          invoiceId: payment.id,
          amount: dto.amount,
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
      }
    } catch (err) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      throw err;
    }
  }

  async findById(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async findMyPayments(userId: string, dto: QueryPaymentDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      userId,
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

  async checkPayment(paymentId: string) {
    const payment = await this.findById(paymentId);

    if (payment.status === 'COMPLETED') return payment;
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
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        externalRef,
        completedAt: new Date(),
      },
    });

    this.messaging.publishEvent('payment.completed', {
      paymentId: payment.id,
      userId: payment.userId,
      courseId: payment.courseId,
      amount: payment.amount.toString(),
      currency: payment.currency,
      provider: payment.provider,
    });

    this.logger.log(`Payment completed: ${paymentId}`);
    return payment;
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

  // Admin: list all payments
  async findAll(dto: QueryPaymentDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = dto.status ? { status: dto.status } : {};

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
