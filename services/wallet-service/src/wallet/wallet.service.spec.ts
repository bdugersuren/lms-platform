import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';

// ── Mock factories ────────────────────────────────────────────────────────────

const makeWallet = (balance: string | number = '1000', overrides: Record<string, unknown> = {}) => ({
  id: 'wallet-1',
  tenantId: 'demo',
  ownerId: 'user-1',
  ownerType: 'USER',
  currency: 'MNT',
  balance: new Decimal(balance),
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeTransaction = (overrides: Record<string, unknown> = {}) => ({
  id: 'tx-1',
  walletId: 'wallet-1',
  type: 'CREDIT',
  status: 'COMPLETED',
  amount: new Decimal('500'),
  balanceBefore: new Decimal('1000'),
  balanceAfter: new Decimal('1500'),
  description: 'Test credit',
  reference: null,
  createdAt: new Date(),
  ...overrides,
});

// ── Test suite ────────────────────────────────────────────────────────────────

describe('WalletService', () => {
  let service: WalletService;

  const mockPrismaInner = {
    wallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };

  const mockPrisma = {
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: typeof mockPrismaInner) => unknown) => fn(mockPrismaInner)),
  };

  const mockMessaging = { publishEvent: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MessagingService, useValue: mockMessaging },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    jest.clearAllMocks();
  });

  // ── getOrCreate ──────────────────────────────────────────────────────────────

  describe('getOrCreate()', () => {
    it('returns existing wallet when found', async () => {
      const wallet = makeWallet();
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);

      const result = await service.getOrCreate('user-1');

      expect(mockPrisma.wallet.findUnique).toHaveBeenCalledWith({
        where: { tenantId_ownerId: { tenantId: 'demo', ownerId: 'user-1' } },
      });
      expect(mockPrisma.wallet.create).not.toHaveBeenCalled();
      expect(result).toEqual(wallet);
    });

    it('creates new wallet when not found', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      const wallet = makeWallet('0');
      mockPrisma.wallet.create.mockResolvedValue(wallet);

      const result = await service.getOrCreate('user-1');

      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ ownerId: 'user-1', currency: 'MNT' }),
      });
      expect(result).toEqual(wallet);
    });
  });

  // ── credit ───────────────────────────────────────────────────────────────────

  describe('credit()', () => {
    it('increases balance and returns transaction', async () => {
      const wallet = makeWallet('1000');
      mockPrismaInner.wallet.findUnique.mockResolvedValue(wallet);
      mockPrismaInner.wallet.update.mockResolvedValue({ ...wallet, balance: new Decimal('1500') });
      const tx = makeTransaction({ amount: new Decimal('500'), balanceAfter: new Decimal('1500') });
      mockPrismaInner.transaction.create.mockResolvedValue(tx);

      const result = await service.credit('user-1', 500, 'Test credit');

      expect(mockPrismaInner.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            balance: expect.objectContaining({ d: expect.any(Array) }), // Decimal object
          }),
        }),
      );
      expect(result.amount.toString()).toBe('500');
    });

    it('throws NotFoundException when wallet not found', async () => {
      mockPrismaInner.wallet.findUnique.mockResolvedValue(null);

      await expect(service.credit('user-x', 500, 'Test')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when wallet is SUSPENDED', async () => {
      mockPrismaInner.wallet.findUnique.mockResolvedValue(makeWallet('1000', { status: 'SUSPENDED' }));

      await expect(service.credit('user-1', 500, 'Test')).rejects.toThrow(BadRequestException);
    });

    it('idempotency: returns existing transaction on duplicate reference (P2002)', async () => {
      const wallet = makeWallet('1000');
      mockPrismaInner.wallet.findUnique.mockResolvedValue(wallet);
      mockPrismaInner.wallet.update.mockResolvedValue(wallet);

      const duplicateError = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: {},
      });
      mockPrismaInner.transaction.create.mockRejectedValue(duplicateError);
      const existingTx = makeTransaction({ reference: 'ref-123' });
      mockPrismaInner.transaction.findUniqueOrThrow.mockResolvedValue(existingTx);

      const result = await service.credit('user-1', 500, 'Test', 'CREDIT', 'ref-123');

      expect(mockPrismaInner.transaction.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { reference: 'ref-123' },
      });
      expect(result).toEqual(existingTx);
    });

    it('Decimal precision: 100.50 + 0.10 = 100.60 (no floating-point drift)', async () => {
      const wallet = makeWallet('100.50');
      mockPrismaInner.wallet.findUnique.mockResolvedValue(wallet);

      let updatedBalance: Decimal | undefined;
      mockPrismaInner.wallet.update.mockImplementation(({ data }: { data: { balance: Decimal } }) => {
        updatedBalance = data.balance;
        return Promise.resolve({ ...wallet, balance: data.balance });
      });
      mockPrismaInner.transaction.create.mockResolvedValue(makeTransaction());

      await service.credit('user-1', '0.10', 'Precision test');

      expect(updatedBalance?.toString()).toBe('100.6');
    });

    it('re-throws non-P2002 errors from transaction.create', async () => {
      const wallet = makeWallet('1000');
      mockPrismaInner.wallet.findUnique.mockResolvedValue(wallet);
      mockPrismaInner.wallet.update.mockResolvedValue(wallet);
      mockPrismaInner.transaction.create.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.credit('user-1', 500, 'Test')).rejects.toThrow('DB connection lost');
    });
  });

  // ── debit ────────────────────────────────────────────────────────────────────

  describe('debit()', () => {
    it('decreases balance and returns transaction', async () => {
      const wallet = makeWallet('1000');
      mockPrismaInner.wallet.findUnique.mockResolvedValue(wallet);
      mockPrismaInner.wallet.update.mockResolvedValue({ ...wallet, balance: new Decimal('700') });
      const tx = makeTransaction({ type: 'DEBIT', amount: new Decimal('300') });
      mockPrismaInner.transaction.create.mockResolvedValue(tx);

      const result = await service.debit('user-1', 300, 'Test debit');

      expect(mockPrismaInner.wallet.update).toHaveBeenCalled();
      expect(result.type).toBe('DEBIT');
    });

    it('throws BadRequestException on insufficient balance', async () => {
      const wallet = makeWallet('100'); // balance = 100
      mockPrismaInner.wallet.findUnique.mockResolvedValue(wallet);

      await expect(service.debit('user-1', 500, 'Test')).rejects.toThrow(
        new BadRequestException('Insufficient balance'),
      );
      expect(mockPrismaInner.wallet.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when wallet is SUSPENDED', async () => {
      mockPrismaInner.wallet.findUnique.mockResolvedValue(makeWallet('1000', { status: 'SUSPENDED' }));

      await expect(service.debit('user-1', 100, 'Test')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when wallet not found', async () => {
      mockPrismaInner.wallet.findUnique.mockResolvedValue(null);

      await expect(service.debit('user-x', 100, 'Test')).rejects.toThrow(NotFoundException);
    });

    it('allows debit of exact balance (boundary: 1000 - 1000 = 0)', async () => {
      const wallet = makeWallet('1000');
      mockPrismaInner.wallet.findUnique.mockResolvedValue(wallet);
      mockPrismaInner.wallet.update.mockResolvedValue({ ...wallet, balance: new Decimal('0') });
      mockPrismaInner.transaction.create.mockResolvedValue(makeTransaction({ type: 'DEBIT' }));

      await expect(service.debit('user-1', 1000, 'Test')).resolves.toBeDefined();
    });

    it('Decimal precision: 100.50 - 0.10 = 100.40 (no floating-point drift)', async () => {
      const wallet = makeWallet('100.50');
      mockPrismaInner.wallet.findUnique.mockResolvedValue(wallet);

      let updatedBalance: Decimal | undefined;
      mockPrismaInner.wallet.update.mockImplementation(({ data }: { data: { balance: Decimal } }) => {
        updatedBalance = data.balance;
        return Promise.resolve({ ...wallet, balance: data.balance });
      });
      mockPrismaInner.transaction.create.mockResolvedValue(makeTransaction({ type: 'DEBIT' }));

      await service.debit('user-1', '0.10', 'Precision test');

      expect(updatedBalance?.toString()).toBe('100.4');
    });
  });
});
