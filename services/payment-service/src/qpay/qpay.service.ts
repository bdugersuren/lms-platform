import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface QPayInvoice {
  invoiceId: string;
  qrCode: string;
  qrImage: string; // base64
  deepLinks: QPayDeepLink[];
  expiredAt: Date;
}

export interface QPayDeepLink {
  name: string;
  description: string;
  logo: string;
  link: string;
}

export interface QPayPaymentCheck {
  paid: boolean;
  externalRef?: string;
}

@Injectable()
export class QPayService {
  private readonly logger = new Logger(QPayService.name);
  private readonly http: AxiosInstance;

  // QPay sandbox credentials from env (optional — falls back to mock)
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly callbackUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>('QPAY_BASE_URL', 'https://merchant.qpay.mn/v2');
    this.username = config.get<string>('QPAY_USERNAME', '');
    this.password = config.get<string>('QPAY_PASSWORD', '');
    this.callbackUrl = config.get<string>('QPAY_CALLBACK_URL', 'http://localhost:3008/api/v1/webhooks/qpay');

    this.http = axios.create({ baseURL: this.baseUrl, timeout: 10_000 });
  }

  private get isMockMode(): boolean {
    return !this.username || !this.password;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const res = await this.http.post<{ access_token: string }>(
        '/auth/token',
        {},
        {
          auth: { username: this.username, password: this.password },
        },
      );
      this.accessToken = res.data.access_token;
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000); // 55 min
      return this.accessToken;
    } catch (err) {
      this.logger.error('QPay auth failed', err);
      throw new ServiceUnavailableException('QPay authentication failed');
    }
  }

  async createInvoice(params: {
    invoiceCode: string;
    senderInvoiceNo: string;
    invoiceReceiverCode: string;
    amount: number;
    description: string;
  }): Promise<QPayInvoice> {
    if (this.isMockMode) {
      return this.mockInvoice(params.senderInvoiceNo, params.amount);
    }

    try {
      const token = await this.getAccessToken();
      const res = await this.http.post(
        '/invoice',
        {
          invoice_code: params.invoiceCode,
          sender_invoice_no: params.senderInvoiceNo,
          invoice_receiver_code: params.invoiceReceiverCode,
          invoice_description: params.description,
          amount: params.amount,
          callback_url: `${this.callbackUrl}/${params.senderInvoiceNo}`,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const d = res.data;
      return {
        invoiceId: d.invoice_id,
        qrCode: d.qr_text,
        qrImage: d.qr_image,
        deepLinks: (d.urls ?? []).map((u: Record<string, string>) => ({
          name: u.name,
          description: u.description,
          logo: u.logo,
          link: u.link,
        })),
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
      };
    } catch (err) {
      this.logger.error('QPay createInvoice failed', err);
      throw new ServiceUnavailableException('QPay invoice creation failed');
    }
  }

  async checkPayment(invoiceId: string): Promise<QPayPaymentCheck> {
    if (this.isMockMode) {
      // In mock mode always return unpaid — webhook simulates the completion
      return { paid: false };
    }

    try {
      const token = await this.getAccessToken();
      const res = await this.http.post(
        '/payment/check',
        { object_type: 'INVOICE', object_id: invoiceId, offset: { page_number: 1, page_limit: 100 } },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const rows: Array<{ payment_status: string; transaction_id?: string }> = res.data.rows ?? [];
      const completed = rows.find((r) => r.payment_status === 'PAID');
      return { paid: !!completed, externalRef: completed?.transaction_id };
    } catch (err) {
      this.logger.error('QPay checkPayment failed', err);
      return { paid: false };
    }
  }

  // ── Mock helpers (used when QPAY_USERNAME/PASSWORD not set) ─────────────────

  private mockInvoice(senderInvoiceNo: string, amount: number): QPayInvoice {
    const qrData = `QPAY:${senderInvoiceNo}:${amount}:MNT`;
    return {
      invoiceId: `mock-qpay-${senderInvoiceNo}`,
      qrCode: qrData,
      qrImage: this.generateMockQrBase64(qrData),
      deepLinks: [
        {
          name: 'QPay',
          description: 'QPay апп',
          logo: 'https://qpay.mn/q.png',
          link: `qpay://q.qpay.mn/p?qPay_QRcode=${encodeURIComponent(qrData)}`,
        },
        {
          name: 'Khan Bank',
          description: 'Khan Bank апп',
          logo: 'https://qpay.mn/bank/khan.png',
          link: `khanbank://payment?qr=${encodeURIComponent(qrData)}`,
        },
        {
          name: 'Golomt Bank',
          description: 'Golomt Bank апп',
          logo: 'https://qpay.mn/bank/golomt.png',
          link: `golomtbank://payment?qr=${encodeURIComponent(qrData)}`,
        },
      ],
      expiredAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  // Minimal SVG encoded as base64 to represent a mock QR
  private generateMockQrBase64(data: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="white"/>
      <rect x="10" y="10" width="60" height="60" fill="none" stroke="black" stroke-width="4"/>
      <rect x="20" y="20" width="40" height="40" fill="black"/>
      <rect x="130" y="10" width="60" height="60" fill="none" stroke="black" stroke-width="4"/>
      <rect x="140" y="20" width="40" height="40" fill="black"/>
      <rect x="10" y="130" width="60" height="60" fill="none" stroke="black" stroke-width="4"/>
      <rect x="20" y="140" width="40" height="40" fill="black"/>
      <text x="100" y="108" text-anchor="middle" font-size="8" fill="#666">MOCK QR</text>
      <text x="100" y="120" text-anchor="middle" font-size="7" fill="#999">${data.slice(0, 20)}</text>
    </svg>`;
    return Buffer.from(svg).toString('base64');
  }
}
