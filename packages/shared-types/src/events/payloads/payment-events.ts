export type PaymentPurpose = 'COURSE_PURCHASE' | 'WALLET_TOPUP';

export interface PaymentConfirmedPayload {
  paymentId: string;
  userId: string;
  courseId?: string;
  walletOwnerId?: string;
  amount: string;
  currency: string;
  provider: string;
  purpose: PaymentPurpose;
}

export interface PaymentFailedPayload {
  paymentId: string;
  userId: string;
  courseId?: string;
  amount: string;
  currency: string;
  provider: string;
  purpose: PaymentPurpose;
  reason?: string;
}
