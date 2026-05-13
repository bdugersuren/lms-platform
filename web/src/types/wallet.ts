export type WalletStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type TransactionType =
  | 'CREDIT'
  | 'DEBIT'
  | 'REVENUE_SHARE'
  | 'PAYOUT'
  | 'REFUND'
  | 'PLATFORM_FEE';
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
  totalGross: string | number;
  totalPlatformFee: string | number;
  totalNet: string | number;
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
  amount: number;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  note?: string;
}
