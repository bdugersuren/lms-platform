import { PrismaClient, PaymentProvider, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const U = {
  STUDENT_1: 'a0000001-0000-0000-0000-000000000005',
  STUDENT_2: 'a0000001-0000-0000-0000-000000000006',
  STUDENT_3: 'a0000001-0000-0000-0000-000000000007',
};

const C = {
  COURSE_1: 'c0000001-0000-0000-0000-000000000001',
  COURSE_2: 'c0000001-0000-0000-0000-000000000002',
  COURSE_3: 'c0000001-0000-0000-0000-000000000003',
};

async function main() {
  console.log('Seeding payment-service...');

  const payments = [
    // student1 → course1 (completed payment)
    {
      id: 'py000001-0000-0000-0000-000000000001',
      userId: U.STUDENT_1,
      courseId: C.COURSE_1,
      amount: new Decimal(49000),
      currency: 'MNT',
      provider: PaymentProvider.QPAY,
      status: PaymentStatus.COMPLETED,
      invoiceId: 'INV-2026-0001',
      externalRef: 'QPAY-TXN-20260301-001',
      description: 'TypeScript Fundamentals сургалтын төлбөр',
      completedAt: new Date('2026-03-01T10:30:00Z'),
    },
    // student1 → course2 (completed payment)
    {
      id: 'py000001-0000-0000-0000-000000000002',
      userId: U.STUDENT_1,
      courseId: C.COURSE_2,
      amount: new Decimal(79000),
      currency: 'MNT',
      provider: PaymentProvider.QPAY,
      status: PaymentStatus.COMPLETED,
      invoiceId: 'INV-2026-0002',
      externalRef: 'QPAY-TXN-20260415-002',
      description: 'NestJS Backend Development сургалтын төлбөр',
      completedAt: new Date('2026-04-15T14:22:00Z'),
    },
    // student2 → course1 (completed)
    {
      id: 'py000001-0000-0000-0000-000000000003',
      userId: U.STUDENT_2,
      courseId: C.COURSE_1,
      amount: new Decimal(49000),
      currency: 'MNT',
      provider: PaymentProvider.SOCIAL_PAY,
      status: PaymentStatus.COMPLETED,
      invoiceId: 'INV-2026-0003',
      externalRef: 'SPAY-TXN-20260501-003',
      description: 'TypeScript Fundamentals сургалтын төлбөр',
      completedAt: new Date('2026-05-01T09:15:00Z'),
    },
    // student3 → course3 (pending)
    {
      id: 'py000001-0000-0000-0000-000000000004',
      userId: U.STUDENT_3,
      courseId: C.COURSE_3,
      amount: new Decimal(59000),
      currency: 'MNT',
      provider: PaymentProvider.QPAY,
      status: PaymentStatus.PENDING,
      invoiceId: 'INV-2026-0004',
      description: 'Docker & DevOps Essentials сургалтын төлбөр',
      expiredAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  ];

  for (const p of payments) {
    await prisma.payment.upsert({
      where:  { id: p.id },
      update: {},
      create: p,
    });
  }
  console.log(`  ✓ ${payments.length} payments (3 completed, 1 pending)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
