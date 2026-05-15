import { PrismaClient, WalletStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const U = {
  SUPER_ADMIN:  'a0000001-0000-0000-0000-000000000001',
  ADMIN_1:      'a0000001-0000-0000-0000-000000000002',
  INSTRUCTOR_1: 'a0000001-0000-0000-0000-000000000003',
  INSTRUCTOR_2: 'a0000001-0000-0000-0000-000000000004',
  STUDENT_1:    'a0000001-0000-0000-0000-000000000005',
  STUDENT_2:    'a0000001-0000-0000-0000-000000000006',
  STUDENT_3:    'a0000001-0000-0000-0000-000000000007',
};

const WALLETS = [
  { id: 'w0000001-0000-0000-0000-000000000001', ownerId: U.SUPER_ADMIN,  balance: new Decimal(0) },
  { id: 'w0000001-0000-0000-0000-000000000002', ownerId: U.ADMIN_1,      balance: new Decimal(0) },
  { id: 'w0000001-0000-0000-0000-000000000003', ownerId: U.INSTRUCTOR_1, balance: new Decimal(185500) },
  { id: 'w0000001-0000-0000-0000-000000000004', ownerId: U.INSTRUCTOR_2, balance: new Decimal(42300) },
  { id: 'w0000001-0000-0000-0000-000000000005', ownerId: U.STUDENT_1,    balance: new Decimal(12000) },
  { id: 'w0000001-0000-0000-0000-000000000006', ownerId: U.STUDENT_2,    balance: new Decimal(0) },
  { id: 'w0000001-0000-0000-0000-000000000007', ownerId: U.STUDENT_3,    balance: new Decimal(5000) },
];

async function main() {
  console.log('Seeding wallet-service...');

  for (const w of WALLETS) {
    await prisma.wallet.upsert({
      where:  { ownerId: w.ownerId },
      update: {},
      create: { ...w, status: WalletStatus.ACTIVE, currency: 'MNT', ownerType: 'USER' },
    });
  }
  console.log(`  ✓ ${WALLETS.length} wallets`);

  // ── Revenue share transactions for instructor1 ───────────────────────────
  const instructorWallet = WALLETS[2]; // instructor_1
  const transactions = [
    {
      id: 'tx000001-0000-0000-0000-000000000001',
      walletId: instructorWallet.id,
      type: TransactionType.REVENUE_SHARE,
      status: TransactionStatus.COMPLETED,
      amount: new Decimal(39200),
      balanceBefore: new Decimal(0),
      balanceAfter: new Decimal(39200),
      description: 'TypeScript Fundamentals — student1 enrollment revenue',
      reference: 'e0000001-0000-0000-0000-000000000001',
    },
    {
      id: 'tx000001-0000-0000-0000-000000000002',
      walletId: instructorWallet.id,
      type: TransactionType.REVENUE_SHARE,
      status: TransactionStatus.COMPLETED,
      amount: new Decimal(63200),
      balanceBefore: new Decimal(39200),
      balanceAfter: new Decimal(102400),
      description: 'NestJS Backend — student1 enrollment revenue',
      reference: 'e0000001-0000-0000-0000-000000000002',
    },
    {
      id: 'tx000001-0000-0000-0000-000000000003',
      walletId: instructorWallet.id,
      type: TransactionType.CREDIT,
      status: TransactionStatus.COMPLETED,
      amount: new Decimal(83100),
      balanceBefore: new Decimal(102400),
      balanceAfter: new Decimal(185500),
      description: 'Нэмэлт орлого',
      reference: null,
    },
  ];

  for (const tx of transactions) {
    await prisma.transaction.upsert({
      where:  { id: tx.id },
      update: {},
      create: { ...tx, currency: 'MNT' },
    });
  }
  console.log(`  ✓ ${transactions.length} transactions (instructor1)`);

  // ── Revenue share records ─────────────────────────────────────────────────
  const revenueShares = [
    {
      id: 'rs000001-0000-0000-0000-000000000001',
      walletId: instructorWallet.id,
      courseId: 'c0000001-0000-0000-0000-000000000001',
      enrollmentId: 'e0000001-0000-0000-0000-000000000001',
      grossAmount: new Decimal(49000),
      platformFee: new Decimal(9800),
      netAmount: new Decimal(39200),
      feePercent: new Decimal(20),
    },
    {
      id: 'rs000001-0000-0000-0000-000000000002',
      walletId: instructorWallet.id,
      courseId: 'c0000001-0000-0000-0000-000000000002',
      enrollmentId: 'e0000001-0000-0000-0000-000000000002',
      grossAmount: new Decimal(79000),
      platformFee: new Decimal(15800),
      netAmount: new Decimal(63200),
      feePercent: new Decimal(20),
    },
  ];

  for (const rs of revenueShares) {
    await prisma.revenueShare.upsert({
      where:  { enrollmentId: rs.enrollmentId },
      update: {},
      create: rs,
    });
  }
  console.log('  ✓ 2 revenue share records');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
