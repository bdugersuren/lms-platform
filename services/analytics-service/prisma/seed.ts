import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('Seeding analytics-service...');

  // ── Daily KPI — last 7 days ───────────────────────────────────────────────
  const kpiData = [
    { daysBack: 6, newUsers: 3, newEnrollments: 2, completedCourses: 0, confirmedPayments: 2, revenueAmount: 98000, quizAttempts: 4, avgQuizScore: 78.5, assignmentSubmissions: 1, certificatesIssued: 0 },
    { daysBack: 5, newUsers: 1, newEnrollments: 1, completedCourses: 0, confirmedPayments: 1, revenueAmount: 49000, quizAttempts: 2, avgQuizScore: 82.0, assignmentSubmissions: 0, certificatesIssued: 0 },
    { daysBack: 4, newUsers: 2, newEnrollments: 0, completedCourses: 0, confirmedPayments: 0, revenueAmount: 0,     quizAttempts: 3, avgQuizScore: 74.0, assignmentSubmissions: 2, certificatesIssued: 0 },
    { daysBack: 3, newUsers: 0, newEnrollments: 1, completedCourses: 1, confirmedPayments: 1, revenueAmount: 59000, quizAttempts: 5, avgQuizScore: 88.0, assignmentSubmissions: 1, certificatesIssued: 1 },
    { daysBack: 2, newUsers: 1, newEnrollments: 2, completedCourses: 0, confirmedPayments: 2, revenueAmount: 128000,quizAttempts: 6, avgQuizScore: 80.5, assignmentSubmissions: 3, certificatesIssued: 0 },
    { daysBack: 1, newUsers: 4, newEnrollments: 3, completedCourses: 0, confirmedPayments: 3, revenueAmount: 187000,quizAttempts: 8, avgQuizScore: 76.2, assignmentSubmissions: 2, certificatesIssued: 0 },
    { daysBack: 0, newUsers: 2, newEnrollments: 1, completedCourses: 0, confirmedPayments: 1, revenueAmount: 49000, quizAttempts: 3, avgQuizScore: 91.0, assignmentSubmissions: 1, certificatesIssued: 0 },
  ];

  for (const kpi of kpiData) {
    const date = daysAgo(kpi.daysBack);
    await prisma.dailyKpi.upsert({
      where:  { date },
      update: {},
      create: {
        date,
        newUsers: kpi.newUsers,
        newEnrollments: kpi.newEnrollments,
        completedCourses: kpi.completedCourses,
        confirmedPayments: kpi.confirmedPayments,
        revenueAmount: kpi.revenueAmount,
        quizAttempts: kpi.quizAttempts,
        avgQuizScore: kpi.avgQuizScore,
        assignmentSubmissions: kpi.assignmentSubmissions,
        certificatesIssued: kpi.certificatesIssued,
      },
    });
  }
  console.log('  ✓ 7-day daily KPI records');

  // ── Analytics Events ──────────────────────────────────────────────────────
  const events = [
    {
      id: 'ae000001-0000-0000-0000-000000000001',
      eventType: 'auth.user.registered',
      userId: 'a0000001-0000-0000-0000-000000000005',
      payload: { email: 'student1@lms.mn', role: 'STUDENT' },
      occurredAt: new Date('2026-03-01T10:00:00Z'),
    },
    {
      id: 'ae000001-0000-0000-0000-000000000002',
      eventType: 'payment.confirmed',
      userId: 'a0000001-0000-0000-0000-000000000005',
      courseId: 'c0000001-0000-0000-0000-000000000001',
      payload: { amount: 49000, currency: 'MNT', provider: 'QPAY' },
      occurredAt: new Date('2026-03-01T10:30:00Z'),
    },
    {
      id: 'ae000001-0000-0000-0000-000000000003',
      eventType: 'enrollment.created',
      userId: 'a0000001-0000-0000-0000-000000000005',
      courseId: 'c0000001-0000-0000-0000-000000000001',
      payload: { enrollmentId: 'e0000001-0000-0000-0000-000000000001' },
      occurredAt: new Date('2026-03-01T10:31:00Z'),
    },
    {
      id: 'ae000001-0000-0000-0000-000000000004',
      eventType: 'course.completed',
      userId: 'a0000001-0000-0000-0000-000000000005',
      courseId: 'c0000001-0000-0000-0000-000000000001',
      payload: { score: 92, completedAt: '2026-04-10' },
      occurredAt: new Date('2026-04-10T08:00:00Z'),
    },
    {
      id: 'ae000001-0000-0000-0000-000000000005',
      eventType: 'quiz.submitted',
      userId: 'a0000001-0000-0000-0000-000000000005',
      courseId: 'c0000001-0000-0000-0000-000000000001',
      payload: { quizId: 'q0000001-0000-0000-0000-000000000001', score: 90, passed: true },
      occurredAt: new Date('2026-03-15T14:20:00Z'),
    },
    {
      id: 'ae000001-0000-0000-0000-000000000006',
      eventType: 'certificate.issued',
      userId: 'a0000001-0000-0000-0000-000000000005',
      courseId: 'c0000001-0000-0000-0000-000000000001',
      payload: { verifyCode: 'LMS-CERT-2026-TS-001' },
      occurredAt: new Date('2026-04-10T08:05:00Z'),
    },
    {
      id: 'ae000001-0000-0000-0000-000000000007',
      eventType: 'auth.user.registered',
      userId: 'a0000001-0000-0000-0000-000000000006',
      payload: { email: 'student2@lms.mn', role: 'STUDENT' },
      occurredAt: new Date('2026-05-01T09:00:00Z'),
    },
    {
      id: 'ae000001-0000-0000-0000-000000000008',
      eventType: 'payment.confirmed',
      userId: 'a0000001-0000-0000-0000-000000000006',
      courseId: 'c0000001-0000-0000-0000-000000000001',
      payload: { amount: 49000, currency: 'MNT', provider: 'SOCIAL_PAY' },
      occurredAt: new Date('2026-05-01T09:15:00Z'),
    },
  ];

  for (const ev of events) {
    await prisma.analyticsEvent.upsert({
      where:  { id: ev.id },
      update: {},
      create: ev,
    });
  }
  console.log(`  ✓ ${events.length} analytics events`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
