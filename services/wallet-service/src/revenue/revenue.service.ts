import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { MessagingService } from '../messaging/messaging.service';

const PLATFORM_FEE_PERCENT = new Decimal('20'); // 20% platform fee

@Injectable()
export class RevenueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly messaging: MessagingService,
  ) {}

  /**
   * Called when a course enrollment payment is confirmed.
   * Splits gross amount: platform keeps feePercent, instructor gets the rest.
   */
  async distributeRevenue(
    instructorId: string,
    courseId: string,
    enrollmentId: string,
    grossAmount: number,
  ) {
    const gross = new Decimal(grossAmount);
    const platformFee = gross.times(PLATFORM_FEE_PERCENT).dividedBy(100).toDecimalPlaces(2);
    const netAmount = gross.minus(platformFee);

    const wallet = await this.walletService.getOrCreate(instructorId, 'USER');

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
          courseId,
          enrollmentId,
          grossAmount: gross,
          platformFee,
          netAmount,
          feePercent: PLATFORM_FEE_PERCENT,
        },
      });

      this.messaging.publishEvent('wallet.revenue.distributed', {
        instructorId,
        courseId,
        enrollmentId,
        grossAmount,
        platformFee: platformFee.toNumber(),
        netAmount: netAmount.toNumber(),
      });

      return share;
    });
  }

  async listByOwner(ownerId: string, page = 1, limit = 20) {
    const wallet = await this.walletService.findByOwner(ownerId);

    const [items, total] = await Promise.all([
      this.prisma.revenueShare.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.revenueShare.count({ where: { walletId: wallet.id } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async summary(ownerId: string) {
    const wallet = await this.walletService.findByOwner(ownerId);

    const agg = await this.prisma.revenueShare.aggregate({
      where: { walletId: wallet.id },
      _sum: { grossAmount: true, platformFee: true, netAmount: true },
      _count: true,
    });

    return {
      totalGross: agg._sum.grossAmount ?? 0,
      totalPlatformFee: agg._sum.platformFee ?? 0,
      totalNet: agg._sum.netAmount ?? 0,
      enrollmentCount: agg._count,
    };
  }
}
