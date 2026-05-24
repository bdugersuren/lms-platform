import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeePolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenueShareFeePercent(tenantId = 'demo', currency = 'MNT'): Promise<Decimal> {
    const policy = await this.prisma.feePolicy.findFirst({
      where: {
        tenantId,
        currency,
        policyType: 'REVENUE_SHARE',
        isActive: true,
        effectiveFrom: { lte: new Date() },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return new Decimal(policy?.feePercent?.toString() ?? process.env.PLATFORM_FEE_PERCENT ?? '20');
  }
}
