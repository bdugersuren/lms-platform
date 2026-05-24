export type WalletStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type TransactionType =
  | 'CREDIT'
  | 'WALLET_TOPUP'
  | 'DEBIT'
  | 'REVENUE_SHARE'
  | 'PAYOUT'
  | 'REFUND'
  | 'PLATFORM_FEE'
  | 'ADMIN_ADJUSTMENT';

export type PaymentProvider = 'QPAY' | 'SOCIAL_PAY' | 'MOCK' | 'WALLET';
export type PaymentPurpose = 'COURSE_PURCHASE' | 'WALLET_TOPUP';
export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export interface Payment {
  id: string;
  userId: string;
  purpose: PaymentPurpose;
  courseId: string | null;
  walletOwnerId: string | null;
  amount: string;
  currency: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  invoiceId: string | null;
  qrCode: string | null;
  qrImage: string | null;
  deepLinks: { name: string; logo: string; link: string }[] | null;
  checkoutUrl: string | null;
  description: string | null;
  expiredAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateTopupDto {
  purpose: 'WALLET_TOPUP';
  amount: string;
  provider: PaymentProvider;
  returnUrl?: string;
}
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

export interface Wallet {
  id: string;
  ownerId: string;
  ownerType: string;
  balance: string; // Decimal as string
  currency: string;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number; payouts: number };
}

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  currency: string;
  description: string | null;
  reference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueShare {
  id: string;
  walletId: string;
  courseId: string;
  enrollmentId: string;
  grossAmount: string;
  platformFee: string;
  netAmount: string;
  feePercent: string;
  createdAt: string;
}

export interface RevenueSummary {
  totalGross: string;
  totalPlatformFee: string;
  totalNet: string;
  feePercent: string;
  enrollmentCount: number;
}

export interface Payout {
  id: string;
  walletId: string;
  amount: string;
  currency: string;
  status: PayoutStatus;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  note: string | null;
  processedAt: string | null;
  rejectedReason: string | null;
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

export interface CreatePayoutDto {
  amount: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  note?: string;
}
