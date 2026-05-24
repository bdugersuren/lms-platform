import { PrismaClient, ProgressStatus } from '@prisma/client';

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

const TENANT_ID = 'demo';

// Lesson IDs from course-service seed
const LESSONS_C1 = [
  'l1000001-0000-0000-0000-000000000001',
  'l1000001-0000-0000-0000-000000000002',
  'l1000001-0000-0000-0000-000000000003',
  'l1000001-0000-0000-0000-000000000004',
  'l1000001-0000-0000-0000-000000000005',
  'l1000001-0000-0000-0000-000000000006',
];

const LESSONS_C2 = [
  'l2000001-0000-0000-0000-000000000001',
  'l2000001-0000-0000-0000-000000000002',
  'l2000001-0000-0000-0000-000000000003',
];

async function main() {
  console.log('Seeding enrollment-service...');

  // student1 → course1 (fully completed)
  const enr1 = await prisma.enrollment.upsert({
    where: { tenantId_courseId_studentId: { tenantId: TENANT_ID, courseId: C.COURSE_1, studentId: U.STUDENT_1 } },
    update: {},
    create: {
      id: 'e0000001-0000-0000-0000-000000000001',
      tenantId: TENANT_ID,
      courseId: C.COURSE_1,
      studentId: U.STUDENT_1,
      progressPercent: 100,
      totalScore: 92,
      completed: true,
      completedAt: new Date('2026-04-10'),
    },
  });

  for (const [i, lessonId] of LESSONS_C1.entries()) {
    await prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enr1.id, lessonId } },
      update: {},
      create: {
        id: `lp-e1-${i + 1}`,
        enrollmentId: enr1.id,
        lessonId,
        status: ProgressStatus.COMPLETED,
        progressPercent: 100,
        score: 90 + i,
        completed: true,
        unlockedAt: new Date('2026-03-01'),
        completedAt: new Date(`2026-03-${String(i + 5).padStart(2, '0')}`),
      },
    });
  }
  console.log('  ✓ student1 → course1 (100% complete)');

  // student1 → course2 (in progress)
  const enr2 = await prisma.enrollment.upsert({
    where: { tenantId_courseId_studentId: { tenantId: TENANT_ID, courseId: C.COURSE_2, studentId: U.STUDENT_1 } },
    update: {},
    create: {
      id: 'e0000001-0000-0000-0000-000000000002',
      tenantId: TENANT_ID,
      courseId: C.COURSE_2,
      studentId: U.STUDENT_1,
      progressPercent: 50,
      totalScore: 78,
      completed: false,
    },
  });

  for (const [i, lessonId] of LESSONS_C2.entries()) {
    await prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enr2.id, lessonId } },
      update: {},
      create: {
        id: `lp-e2-${i + 1}`,
        enrollmentId: enr2.id,
        lessonId,
        status: ProgressStatus.COMPLETED,
        progressPercent: 100,
        score: 75 + i * 5,
        completed: true,
        unlockedAt: new Date('2026-04-15'),
        completedAt: new Date(`2026-04-${String(i + 16).padStart(2, '0')}`),
      },
    });
  }
  console.log('  ✓ student1 → course2 (50% in progress)');

  // student2 → course1 (enrolled, not started)
  await prisma.enrollment.upsert({
    where: { tenantId_courseId_studentId: { tenantId: TENANT_ID, courseId: C.COURSE_1, studentId: U.STUDENT_2 } },
    update: {},
    create: {
      id: 'e0000001-0000-0000-0000-000000000003',
      tenantId: TENANT_ID,
      courseId: C.COURSE_1,
      studentId: U.STUDENT_2,
      progressPercent: 0,
      totalScore: 0,
      completed: false,
    },
  });
  console.log('  ✓ student2 → course1 (enrolled)');

  // student3 → course3 (enrolled)
  await prisma.enrollment.upsert({
    where: { tenantId_courseId_studentId: { tenantId: TENANT_ID, courseId: C.COURSE_3, studentId: U.STUDENT_3 } },
    update: {},
    create: {
      id: 'e0000001-0000-0000-0000-000000000004',
      tenantId: TENANT_ID,
      courseId: C.COURSE_3,
      studentId: U.STUDENT_3,
      progressPercent: 0,
      totalScore: 0,
      completed: false,
    },
  });
  console.log('  ✓ student3 → course3 (enrolled)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
