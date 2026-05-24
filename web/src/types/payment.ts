export type PaymentProvider = 'QPAY' | 'SOCIAL_PAY' | 'MOCK' | 'WALLET';
export type PaymentPurpose = 'COURSE_PURCHASE' | 'WALLET_TOPUP';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export interface QPayDeepLink {
  name: string;
  description: string;
  logo: string;
  link: string;
}

export interface Payment {
  id: string;
  userId: string;
  purpose: PaymentPurpose;
  courseId: string | null;
  walletOwnerId?: string | null;
  amount: string;
  currency: string;
  provider: PaymentProvider;
  status: PaymentStatus;

  // QPay
  invoiceId: string | null;
  qrCode: string | null;
  qrImage: string | null; // base64 SVG/PNG
  deepLinks: QPayDeepLink[] | null;

  // SocialPay
  checkoutUrl: string | null;

  externalRef: string | null;
  description: string | null;
  expiredAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatePaymentDto {
  purpose?: PaymentPurpose;
  courseId?: string;
  amount: string;
  provider: PaymentProvider;
  description?: string;
  returnUrl?: string;
}
