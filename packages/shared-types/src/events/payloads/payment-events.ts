export interface PaymentConfirmedPayload {
  paymentId: string;
  userId: string;
  courseId: string;
  amount: string;
  currency: string;
  provider: string;
}

export interface PaymentFailedPayload {
  paymentId: string;
  userId: string;
  courseId: string;
  amount: string;
  currency: string;
  provider: string;
  reason?: string;
}
