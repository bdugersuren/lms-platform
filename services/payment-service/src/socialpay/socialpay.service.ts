import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { createHmac } from 'crypto';

export interface SocialPayInvoice {
  checkoutUrl: string;
  invoiceId: string;
  expiredAt: Date;
}

export interface SocialPayCheck {
  paid: boolean;
  externalRef?: string;
}

@Injectable()
export class SocialPayService {
  private readonly logger = new Logger(SocialPayService.name);
  private readonly http: AxiosInstance;

  private readonly baseUrl: string;
  private readonly terminalId: string;
  private readonly secretKey: string;
  private readonly callbackUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>('SOCIALPAY_BASE_URL', 'https://ecommerce.golomtbank.com');
    this.terminalId = config.get<string>('SOCIALPAY_TERMINAL_ID', '');
    this.secretKey = config.get<string>('SOCIALPAY_SECRET_KEY', '');
    this.callbackUrl = config.get<string>('SOCIALPAY_CALLBACK_URL', 'http://localhost:3008/api/v1/webhooks/socialpay');

    this.http = axios.create({ baseURL: this.baseUrl, timeout: 10_000 });
  }

  private get isMockMode(): boolean {
    return !this.terminalId || !this.secretKey;
  }

  private sign(data: string): string {
    return createHmac('sha256', this.secretKey).update(data).digest('hex');
  }

  async createInvoice(params: {
    invoiceId: string;
    amount: number;
    description: string;
    returnUrl: string;
  }): Promise<SocialPayInvoice> {
    if (this.isMockMode) {
      return this.mockInvoice(params.invoiceId, params.amount);
    }

    try {
      const payload = {
        terminal: this.terminalId,
        amount: params.amount,
        invoice: params.invoiceId,
        description: params.description,
        callback: this.callbackUrl,
        returnUrl: params.returnUrl,
      };

      const dataStr = `${this.terminalId}${params.amount}${params.invoiceId}`;
      const checksum = this.sign(dataStr);

      const res = await this.http.post<{ invoice: string; checkoutUrl: string }>(
        '/api/invoice/create',
        { ...payload, checksum },
      );

      return {
        checkoutUrl: res.data.checkoutUrl,
        invoiceId: res.data.invoice,
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
      };
    } catch (err) {
      this.logger.error('SocialPay createInvoice failed', err);
      throw new ServiceUnavailableException('SocialPay invoice creation failed');
    }
  }

  async checkPayment(invoiceId: string): Promise<SocialPayCheck> {
    if (this.isMockMode) {
      return { paid: false };
    }

    try {
      const checksum = this.sign(`${this.terminalId}${invoiceId}`);
      const res = await this.http.post<{ status: string; transactionId?: string }>(
        '/api/invoice/check',
        { terminal: this.terminalId, invoice: invoiceId, checksum },
      );

      const paid = res.data.status === 'SUCCESS' || res.data.status === 'PAID';
      return { paid, externalRef: res.data.transactionId };
    } catch (err) {
      this.logger.error('SocialPay checkPayment failed', err);
      return { paid: false };
    }
  }

  verifyWebhookSignature(payload: Record<string, unknown>, receivedChecksum: string): boolean {
    if (this.isMockMode) return true;
    const data = `${payload.terminal ?? ''}${payload.invoice ?? ''}${payload.amount ?? ''}`;
    return this.sign(data) === receivedChecksum;
  }

  private mockInvoice(invoiceId: string, amount: number): SocialPayInvoice {
    const checkoutUrl = `http://localhost:3008/api/v1/payments/mock-checkout?invoice=${invoiceId}&amount=${amount}`;
    return {
      checkoutUrl,
      invoiceId,
      expiredAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }
}
