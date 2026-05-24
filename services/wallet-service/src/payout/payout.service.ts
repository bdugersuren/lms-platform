import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventTypes } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { OutboxService } from '../outbox/outbox.service';
import { CreatePayoutDto } from './dto/create-payout.dto';

@Injectable()
export class PayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly outbox: OutboxService,
  ) {}

  async requestPayout(ownerId: string, dto: CreatePayoutDto, tenantId = 'demo') {
    // Debit reserves the amount — throws if insufficient balance
    await this.walletService.debit(
      ownerId,
      dto.amount,
      `Payout request — ${dto.bankName ?? 'bank'}`,
      'PAYOUT',
      undefined,
      tenantId,
    );

    const wallet = await this.walletService.findByOwner(ownerId, tenantId);

    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.create({
        data: {
          walletId: wallet.id,
          tenantId,
          amount: dto.amount,
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          accountName: dto.accountName,
          note: dto.note,
          status: 'PENDING',
        },
      });

      await this.outbox.enqueue(tx, {
        eventId: randomUUID(),
        eventType: EventTypes.WALLET_PAYOUT_REQUESTED,
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        producer: 'wallet-service',
        aggregateType: 'payout',
        aggregateId: payout.id,
        sequence: 1,
        payload: {
          ownerId,
          payoutId: payout.id,
          amount: dto.amount,
        },
      });

      return payout;
    });
  }

  async listMyPayouts(ownerId: string, page = 1, limit = 20, tenantId = 'demo') {
    const wallet = await this.walletService.findByOwner(ownerId, tenantId);

    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: { walletId: wallet.id, tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payout.count({ where: { walletId: wallet.id, tenantId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async processPayouts(adminId: string) {
    const pending = await this.prisma.payout.findMany({
      where: { status: 'PENDING' },
    });

    if (pending.length === 0) return { processed: 0 };

    await this.prisma.payout.updateMany({
      where: { status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });

    return { processed: pending.length };
  }

  async completePayout(payoutId: string, tenantId = 'demo') {
    const payout = await this.prisma.payout.findFirst({ where: { id: payoutId, tenantId } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status === 'COMPLETED') throw new BadRequestException('Already completed');

    return this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'COMPLETED', processedAt: new Date() },
    });
  }

  async rejectPayout(payoutId: string, reason: string, tenantId = 'demo') {
    const payout = await this.prisma.payout.findFirst({
      where: { id: payoutId, tenantId },
      include: { wallet: true },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status === 'COMPLETED')
      throw new BadRequestException('Cannot reject a completed payout');

    // Refund amount back to wallet
    await this.walletService.credit(
      payout.wallet.ownerId,
      payout.amount.toString(),
      `Payout rejected — refund`,
      'REFUND',
      payoutId,
      tenantId,
    );

    return this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'REJECTED', rejectedReason: reason },
    });
  }
}
