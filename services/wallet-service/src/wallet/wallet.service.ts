import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { assertPositiveMoney } from '@lms/shared-money';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  async getOrCreate(ownerId: string, ownerType = 'USER', tenantId = 'demo') {
    const existing = await this.prisma.wallet.findUnique({
      where: { tenantId_ownerId: { tenantId, ownerId } },
    });
    if (existing) return existing;

    return this.prisma.wallet.create({
      data: { tenantId, ownerId, ownerType, currency: 'MNT' },
    });
  }

  async findByOwner(ownerId: string, tenantId = 'demo') {
    const wallet = await this.prisma.wallet.findUnique({
      where: { tenantId_ownerId: { tenantId, ownerId } },
      include: {
        _count: { select: { transactions: true, payouts: true } },
      },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async findById(id: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  /** Atomic credit — increases balance, records transaction. */
  async credit(
    ownerId: string,
    amount: number | string,
    description: string,
    type: 'CREDIT' | 'WALLET_TOPUP' | 'REVENUE_SHARE' | 'REFUND' | 'ADMIN_ADJUSTMENT' = 'CREDIT',
    reference?: string,
    tenantId = 'demo',
  ) {
    const money = assertPositiveMoney(amount);

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { tenantId_ownerId: { tenantId, ownerId } },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (wallet.status !== 'ACTIVE') throw new BadRequestException('Wallet is not active');

      const balanceBefore = wallet.balance;
      const decimalAmount = new Decimal(money);
      const balanceAfter = new Decimal(wallet.balance.toString()).plus(decimalAmount);

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      try {
        return await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type,
            status: 'COMPLETED',
            amount: decimalAmount,
            balanceBefore,
            balanceAfter,
            description,
            reference,
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          reference
        ) {
          this.logger.warn(
            `Duplicate credit reference=${reference} — returning existing transaction (idempotent)`,
          );
          return tx.transaction.findUniqueOrThrow({ where: { reference } });
        }
        throw err;
      }
    });
  }

  /** Atomic debit — decreases balance, records transaction. */
  async debit(
    ownerId: string,
    amount: number | string,
    description: string,
    type: 'DEBIT' | 'PAYOUT' | 'PLATFORM_FEE' | 'ADMIN_ADJUSTMENT' = 'DEBIT',
    reference?: string,
    tenantId = 'demo',
  ) {
    const money = assertPositiveMoney(amount);

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { tenantId_ownerId: { tenantId, ownerId } },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (wallet.status !== 'ACTIVE') throw new BadRequestException('Wallet is not active');

      const balanceBefore = new Decimal(wallet.balance.toString());
      const decimalAmount = new Decimal(money);
      if (balanceBefore.lessThan(decimalAmount)) {
        throw new BadRequestException('Insufficient balance');
      }

      const balanceAfter = balanceBefore.minus(decimalAmount);

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      return tx.transaction.create({
        data: {
          walletId: wallet.id,
          type,
          status: 'COMPLETED',
          amount: decimalAmount,
          balanceBefore,
          balanceAfter,
          description,
          reference,
        },
      });
    });
  }
}
