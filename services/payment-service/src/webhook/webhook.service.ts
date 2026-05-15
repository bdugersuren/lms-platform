import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { SocialPayService } from '../socialpay/socialpay.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly socialPay: SocialPayService,
  ) {}

  async handleQPay(paymentId: string, rawPayload: Record<string, unknown>): Promise<{ received: boolean }> {
    const log = await this.prisma.webhookLog.create({
      data: {
        provider: 'QPAY',
        paymentId,
        eventType: 'payment.callback',
        payload: rawPayload as never,
      },
    });

    try {
      const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status === 'COMPLETED') {
        return { received: true };
      }

      // QPay sends { payment_status: 'PAID', transaction_id: '...' }
      const status = rawPayload['payment_status'] as string | undefined;
      const transactionId = rawPayload['transaction_id'] as string | undefined;

      if (status === 'PAID' || status === 'SUCCESS') {
        await this.paymentService.completePayment(paymentId, transactionId);
      } else if (status === 'FAILED' || status === 'CANCELLED') {
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'FAILED' },
        });
      }

      await this.prisma.webhookLog.update({
        where: { id: log.id },
        data: { processed: true },
      });
    } catch (err) {
      this.logger.error(`QPay webhook processing failed for payment ${paymentId}`, err);
      await this.prisma.webhookLog.update({
        where: { id: log.id },
        data: { error: (err as Error).message },
      });
    }

    return { received: true };
  }

  async handleSocialPay(rawPayload: Record<string, unknown>): Promise<{ received: boolean }> {
    const log = await this.prisma.webhookLog.create({
      data: {
        provider: 'SOCIAL_PAY',
        eventType: 'payment.callback',
        payload: rawPayload as never,
      },
    });

    try {
      // SocialPay sends { invoice, status, transactionId, checksum }
      const invoiceId = rawPayload['invoice'] as string | undefined;
      const status = rawPayload['status'] as string | undefined;
      const transactionId = rawPayload['transactionId'] as string | undefined;
      const checksum = rawPayload['checksum'] as string | undefined;

      if (!invoiceId) return { received: true };

      // Verify signature
      const valid = this.socialPay.verifyWebhookSignature(rawPayload, checksum ?? '');
      if (!valid) {
        this.logger.warn(`SocialPay webhook signature mismatch for invoice ${invoiceId}`);
        return { received: true };
      }

      const payment = await this.prisma.payment.findFirst({
        where: { invoiceId },
      });

      if (!payment || payment.status === 'COMPLETED') {
        return { received: true };
      }

      if (status === 'SUCCESS' || status === 'PAID') {
        await this.paymentService.completePayment(payment.id, transactionId);
      } else if (status === 'FAILED') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
      }

      await this.prisma.webhookLog.update({
        where: { id: log.id },
        data: { paymentId: payment.id, processed: true },
      });
    } catch (err) {
      this.logger.error('SocialPay webhook processing failed', err);
      await this.prisma.webhookLog.update({
        where: { id: log.id },
        data: { error: (err as Error).message },
      });
    }

    return { received: true };
  }

  // Dev-only: simulate payment completion for testing without real QPay
  async simulateComplete(paymentId: string): Promise<{ received: boolean }> {
    await this.paymentService.completePayment(paymentId, `sim-${Date.now()}`);
    return { received: true };
  }

  async mockPay(paymentId: string): Promise<{ received: boolean }> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error('Payment not found');
    if (payment.provider !== 'MOCK') throw new Error('Not a MOCK payment');
    if (payment.status === 'COMPLETED') return { received: true };
    await this.paymentService.completePayment(paymentId, `mock-${Date.now()}`);
    return { received: true };
  }
}
