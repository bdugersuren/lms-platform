export interface WalletRevenueDistributedPayload {
  tenantId?: string;
  instructorId: string;
  courseId: string;
  enrollmentId: string;
  grossAmount: string;
  platformFee: string;
  netAmount: string;
}

export interface WalletPayoutRequestedPayload {
  ownerId: string;
  payoutId: string;
  amount: string;
}
