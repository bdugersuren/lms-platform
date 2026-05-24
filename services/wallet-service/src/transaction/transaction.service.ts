import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class TransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async listByOwner(ownerId: string, page = 1, limit = 20, tenantId = 'demo') {
    const wallet = await this.walletService.findByOwner(ownerId, tenantId);

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where: { walletId: wallet.id } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, requesterId: string, tenantId = 'demo') {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: { wallet: { select: { ownerId: true, tenantId: true } } },
    });
    if (!tx) throw new NotFoundException(`Transaction ${id} not found`);
    if (tx.wallet.ownerId !== requesterId || tx.wallet.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }
    const { wallet: _wallet, ...result } = tx;
    return result;
  }
}
