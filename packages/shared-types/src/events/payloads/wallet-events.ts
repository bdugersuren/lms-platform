export interface WalletRevenueDistributedPayload {
  instructorId: string;
  courseId: string;
  enrollmentId: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
}

export interface WalletPayoutRequestedPayload {
  ownerId: string;
  payoutId: string;
  amount: number;
}
