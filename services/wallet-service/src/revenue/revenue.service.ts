import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { EventTypes } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { OutboxService } from '../outbox/outbox.service';
import { FeePolicyService } from '../fee-policy/fee-policy.service';

@Injectable()
export class RevenueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly outbox: OutboxService,
    private readonly feePolicy: FeePolicyService,
  ) {}

  /**
   * Called when a course enrollment payment is confirmed.
   * Splits gross amount: platform keeps feePercent, instructor gets the rest.
   */
  async distributeRevenue(
    instructorId: string,
    courseId: string,
    enrollmentId: string,
    grossAmount: string | number,
    tenantId = 'demo',
  ) {
    const gross = new Decimal(grossAmount);
    const feePercent = await this.feePolicy.getRevenueShareFeePercent(tenantId);
    const platformFee = gross.times(feePercent).dividedBy(100).toDecimalPlaces(2);
    const netAmount = gross.minus(platformFee);

    const wallet = await this.walletService.getOrCreate(instructorId, 'USER', tenantId);

    return this.prisma.$transaction(async (tx) => {
      const balanceBefore = wallet.balance;
      const balanceAfter = new Decimal(wallet.balance.toString()).plus(netAmount);

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'REVENUE_SHARE',
          status: 'COMPLETED',
          amount: netAmount,
          balanceBefore,
          balanceAfter,
          description: `Revenue share for course ${courseId}`,
          reference: enrollmentId,
        },
      });

      const share = await tx.revenueShare.create({
        data: {
          walletId: wallet.id,
          tenantId,
          courseId,
          enrollmentId,
          grossAmount: gross,
          platformFee,
          netAmount,
          feePercent,
        },
      });

      await this.outbox.enqueue(tx, {
        eventId: randomUUID(),
        eventType: EventTypes.WALLET_REVENUE_DISTRIBUTED,
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        producer: 'wallet-service',
        aggregateType: 'revenue-share',
        aggregateId: share.id,
        sequence: 1,
        payload: {
          instructorId,
          tenantId,
          courseId,
          enrollmentId,
          grossAmount: gross.toString(),
          platformFee: platformFee.toString(),
          netAmount: netAmount.toString(),
        },
      });

      return share;
    });
  }

  async listByOwner(ownerId: string, page = 1, limit = 20, tenantId = 'demo') {
    const wallet = await this.walletService.findByOwner(ownerId, tenantId);

    const [items, total] = await Promise.all([
      this.prisma.revenueShare.findMany({
        where: { walletId: wallet.id, tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.revenueShare.count({ where: { walletId: wallet.id, tenantId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async summary(ownerId: string, tenantId = 'demo') {
    const wallet = await this.walletService.findByOwner(ownerId, tenantId);

    const agg = await this.prisma.revenueShare.aggregate({
      where: { walletId: wallet.id, tenantId },
      _sum: { grossAmount: true, platformFee: true, netAmount: true },
      _count: true,
    });

    return {
      totalGross: (agg._sum.grossAmount ?? new Decimal(0)).toString(),
      totalPlatformFee: (agg._sum.platformFee ?? new Decimal(0)).toString(),
      totalNet: (agg._sum.netAmount ?? new Decimal(0)).toString(),
      feePercent: (await this.feePolicy.getRevenueShareFeePercent(tenantId)).toString(),
      enrollmentCount: agg._count,
    };
  }
}
