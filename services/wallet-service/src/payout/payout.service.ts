import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { MessagingService } from '../messaging/messaging.service';
import { CreatePayoutDto } from './dto/create-payout.dto';

@Injectable()
export class PayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly messaging: MessagingService,
  ) {}

  async requestPayout(ownerId: string, dto: CreatePayoutDto) {
    // Debit reserves the amount — throws if insufficient balance
    await this.walletService.debit(
      ownerId,
      dto.amount,
      `Payout request — ${dto.bankName ?? 'bank'}`,
      'PAYOUT',
    );

    const wallet = await this.walletService.findByOwner(ownerId);

    const payout = await this.prisma.payout.create({
      data: {
        walletId: wallet.id,
        amount: dto.amount,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        note: dto.note,
        status: 'PENDING',
      },
    });

    this.messaging.publishEvent('wallet.payout.requested', {
      ownerId,
      payoutId: payout.id,
      amount: dto.amount,
    });

    return payout;
  }

  async listMyPayouts(ownerId: string, page = 1, limit = 20) {
    const wallet = await this.walletService.findByOwner(ownerId);

    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payout.count({ where: { walletId: wallet.id } }),
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

  async completePayout(payoutId: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status === 'COMPLETED') throw new BadRequestException('Already completed');

    return this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'COMPLETED', processedAt: new Date() },
    });
  }

  async rejectPayout(payoutId: string, reason: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { wallet: true },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status === 'COMPLETED') throw new BadRequestException('Cannot reject a completed payout');

    // Refund amount back to wallet
    await this.walletService.credit(
      payout.wallet.ownerId,
      Number(payout.amount),
      `Payout rejected — refund`,
      'REFUND',
      payoutId,
    );

    return this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'REJECTED', rejectedReason: reason },
    });
  }
}
