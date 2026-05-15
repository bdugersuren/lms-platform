import { Injectable } from '@nestjs/common';

export interface MockInvoice {
  invoiceId: string;
  qrCode: null;
  qrImage: null;
  deepLinks: [];
  checkoutUrl: null;
  expiredAt: Date;
}

@Injectable()
export class MockPaymentService {
  createInvoice(paymentId: string): MockInvoice {
    return {
      invoiceId: `mock-${paymentId}`,
      qrCode: null,
      qrImage: null,
      deepLinks: [],
      checkoutUrl: null,
      expiredAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  checkPayment(_invoiceId: string): { paid: boolean; externalRef?: string } {
    // Mock payments are only completed via POST /webhooks/mock-pay/:id
    return { paid: false };
  }
}
