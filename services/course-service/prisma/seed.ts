import { PrismaClient, CourseLevel, CourseStatus, LessonType } from '@prisma/client';

const prisma = new PrismaClient();

// ── Shared seed IDs (must match auth-service seed) ───────────────────────────
const U = {
  INSTRUCTOR_1: 'a0000001-0000-0000-0000-000000000003',
  INSTRUCTOR_2: 'a0000001-0000-0000-0000-000000000004',
  STUDENT_1:    'a0000001-0000-0000-0000-000000000005',
};

const C = {
  COURSE_1: 'c0000001-0000-0000-0000-000000000001',
  COURSE_2: 'c0000001-0000-0000-0000-000000000002',
  COURSE_3: 'c0000001-0000-0000-0000-000000000003',
};

const M = {
  C1_M1: 'c1m00001-0000-0000-0000-000000000001',
  C1_M2: 'c1m00001-0000-0000-0000-000000000002',
  C2_M1: 'c2m00001-0000-0000-0000-000000000001',
  C2_M2: 'c2m00001-0000-0000-0000-000000000002',
  C3_M1: 'c3m00001-0000-0000-0000-000000000001',
  C3_M2: 'c3m00001-0000-0000-0000-000000000002',
};

const SKILL_IDS = {
  TYPESCRIPT: 'sk000001-0000-0000-0000-000000000001',
  JAVASCRIPT: 'sk000001-0000-0000-0000-000000000002',
  NESTJS:     'sk000001-0000-0000-0000-000000000003',
  DOCKER:     'sk000001-0000-0000-0000-000000000004',
  DATABASE:   'sk000001-0000-0000-0000-000000000005',
};

async function main() {
  console.log('Seeding course-service...');

  // ── Skills ─────────────────────────────────────────────────────────────────
  const skills = [
    { id: SKILL_IDS.TYPESCRIPT, name: 'TypeScript',  category: 'Programming' },
    { id: SKILL_IDS.JAVASCRIPT, name: 'JavaScript',  category: 'Programming' },
    { id: SKILL_IDS.NESTJS,     name: 'NestJS',      category: 'Backend' },
    { id: SKILL_IDS.DOCKER,     name: 'Docker',      category: 'DevOps' },
    { id: SKILL_IDS.DATABASE,   name: 'PostgreSQL',  category: 'Database' },
  ];
  for (const s of skills) {
    await prisma.skill.upsert({ where: { name: s.name }, update: {}, create: s });
  }
  console.log(`  ✓ ${skills.length} skills`);

  // ── Course 1 — TypeScript Fundamentals ────────────────────────────────────
  await prisma.course.upsert({
    where:  { id: C.COURSE_1 },
    update: {},
    create: {
      id: C.COURSE_1,
      title: 'TypeScript Fundamentals',
      slug: 'typescript-fundamentals',
      description: 'TypeScript хэлний үндэс. Хувьсагч, функц, интерфейс, generic болон бусад үндсэн ойлголтуудыг практик дагуу судлана.',
      instructorId: U.INSTRUCTOR_1,
      price: 49000,
      level: CourseLevel.BEGINNER,
      status: CourseStatus.PUBLISHED,
      tags: ['typescript', 'javascript', 'programming'],
      language: 'mn',
      totalLessons: 6,
      totalMinutes: 180,
      publishedAt: new Date(),
    },
  });

  // ── Course 2 — NestJS Backend Development ────────────────────────────────
  await prisma.course.upsert({
    where:  { id: C.COURSE_2 },
    update: {},
    create: {
      id: C.COURSE_2,
      title: 'NestJS Backend Development',
      slug: 'nestjs-backend-development',
      description: 'NestJS framework ашиглан production-ready REST API бүтээх дэлгэрэнгүй сургалт. Prisma, JWT, Guard, Interceptor бүгдийг хамарна.',
      instructorId: U.INSTRUCTOR_1,
      price: 79000,
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      tags: ['nestjs', 'typescript', 'backend', 'api'],
      language: 'mn',
      totalLessons: 6,
      totalMinutes: 240,
      publishedAt: new Date(),
    },
  });

  // ── Course 3 — Docker & DevOps Essentials ────────────────────────────────
  await prisma.course.upsert({
    where:  { id: C.COURSE_3 },
    update: {},
    create: {
      id: C.COURSE_3,
      title: 'Docker & DevOps Essentials',
      slug: 'docker-devops-essentials',
      description: 'Docker, Docker Compose, CI/CD pipeline болон DevOps практикийг эхлэгчдэд зориулан тайлбарласан практик сургалт.',
      instructorId: U.INSTRUCTOR_2,
      price: 59000,
      level: CourseLevel.BEGINNER,
      status: CourseStatus.PUBLISHED,
      tags: ['docker', 'devops', 'cicd', 'linux'],
      language: 'mn',
      totalLessons: 6,
      totalMinutes: 210,
      publishedAt: new Date(),
    },
  });
  console.log('  ✓ 3 courses');

  // ── Modules ───────────────────────────────────────────────────────────────
  const modules = [
    { id: M.C1_M1, courseId: C.COURSE_1, title: 'TypeScript-ийн үндэс',        sortOrder: 1 },
    { id: M.C1_M2, courseId: C.COURSE_1, title: 'Дэвшилтэт TypeScript',        sortOrder: 2 },
    { id: M.C2_M1, courseId: C.COURSE_2, title: 'NestJS танилцуулга',           sortOrder: 1 },
    { id: M.C2_M2, courseId: C.COURSE_2, title: 'Өгөгдлийн сан ба Prisma',     sortOrder: 2 },
    { id: M.C3_M1, courseId: C.COURSE_3, title: 'Docker үндэс',                sortOrder: 1 },
    { id: M.C3_M2, courseId: C.COURSE_3, title: 'Docker Compose ба Deploy',    sortOrder: 2 },
  ];
  for (const mod of modules) {
    await prisma.module.upsert({
      where:  { id: mod.id },
      update: {},
      create: mod,
    });
  }
  console.log('  ✓ 6 modules');

  // ── Lessons ───────────────────────────────────────────────────────────────
  const lessons = [
    // Course 1 Module 1
    { id: 'l1000001-0000-0000-0000-000000000001', moduleId: M.C1_M1, title: 'TypeScript гэж юу вэ?',            lessonType: LessonType.VIDEO,    sortOrder: 1, estimatedMinutes: 20, isPreview: true  },
    { id: 'l1000001-0000-0000-0000-000000000002', moduleId: M.C1_M1, title: 'Хувьсагч ба өгөгдлийн төрөл',     lessonType: LessonType.VIDEO,    sortOrder: 2, estimatedMinutes: 30, isPreview: false },
    { id: 'l1000001-0000-0000-0000-000000000003', moduleId: M.C1_M1, title: 'Функц ба интерфейс',               lessonType: LessonType.MARKDOWN, sortOrder: 3, estimatedMinutes: 25, isPreview: false },
    // Course 1 Module 2
    { id: 'l1000001-0000-0000-0000-000000000004', moduleId: M.C1_M2, title: 'Generic type',                     lessonType: LessonType.VIDEO,    sortOrder: 1, estimatedMinutes: 35, isPreview: false },
    { id: 'l1000001-0000-0000-0000-000000000005', moduleId: M.C1_M2, title: 'Decorator ашиглах',                lessonType: LessonType.VIDEO,    sortOrder: 2, estimatedMinutes: 30, isPreview: false },
    { id: 'l1000001-0000-0000-0000-000000000006', moduleId: M.C1_M2, title: 'TypeScript best practices',        lessonType: LessonType.MARKDOWN, sortOrder: 3, estimatedMinutes: 40, isPreview: false },
    // Course 2 Module 1
    { id: 'l2000001-0000-0000-0000-000000000001', moduleId: M.C2_M1, title: 'NestJS архитектур',               lessonType: LessonType.VIDEO,    sortOrder: 1, estimatedMinutes: 30, isPreview: true  },
    { id: 'l2000001-0000-0000-0000-000000000002', moduleId: M.C2_M1, title: 'Module, Controller, Service',     lessonType: LessonType.VIDEO,    sortOrder: 2, estimatedMinutes: 40, isPreview: false },
    { id: 'l2000001-0000-0000-0000-000000000003', moduleId: M.C2_M1, title: 'Guard ба JWT',                    lessonType: LessonType.MARKDOWN, sortOrder: 3, estimatedMinutes: 35, isPreview: false },
    // Course 2 Module 2
    { id: 'l2000001-0000-0000-0000-000000000004', moduleId: M.C2_M2, title: 'Prisma ORM суулгах',              lessonType: LessonType.VIDEO,    sortOrder: 1, estimatedMinutes: 25, isPreview: false },
    { id: 'l2000001-0000-0000-0000-000000000005', moduleId: M.C2_M2, title: 'CRUD үйлдэл',                    lessonType: LessonType.VIDEO,    sortOrder: 2, estimatedMinutes: 40, isPreview: false },
    { id: 'l2000001-0000-0000-0000-000000000006', moduleId: M.C2_M2, title: 'Transaction ба relation',        lessonType: LessonType.MARKDOWN, sortOrder: 3, estimatedMinutes: 40, isPreview: false },
    // Course 3 Module 1
    { id: 'l3000001-0000-0000-0000-000000000001', moduleId: M.C3_M1, title: 'Docker суулгах',                  lessonType: LessonType.VIDEO,    sortOrder: 1, estimatedMinutes: 20, isPreview: true  },
    { id: 'l3000001-0000-0000-0000-000000000002', moduleId: M.C3_M1, title: 'Image ба Container',              lessonType: LessonType.VIDEO,    sortOrder: 2, estimatedMinutes: 35, isPreview: false },
    { id: 'l3000001-0000-0000-0000-000000000003', moduleId: M.C3_M1, title: 'Dockerfile бичих',               lessonType: LessonType.MARKDOWN, sortOrder: 3, estimatedMinutes: 30, isPreview: false },
    // Course 3 Module 2
    { id: 'l3000001-0000-0000-0000-000000000004', moduleId: M.C3_M2, title: 'Docker Compose',                  lessonType: LessonType.VIDEO,    sortOrder: 1, estimatedMinutes: 40, isPreview: false },
    { id: 'l3000001-0000-0000-0000-000000000005', moduleId: M.C3_M2, title: 'Multi-service орчин',             lessonType: LessonType.VIDEO,    sortOrder: 2, estimatedMinutes: 45, isPreview: false },
    { id: 'l3000001-0000-0000-0000-000000000006', moduleId: M.C3_M2, title: 'CI/CD pipeline',                  lessonType: LessonType.MARKDOWN, sortOrder: 3, estimatedMinutes: 40, isPreview: false },
  ];
  for (const lesson of lessons) {
    await prisma.lesson.upsert({
      where:  { id: lesson.id },
      update: {},
      create: lesson,
    });
  }
  console.log('  ✓ 18 lessons');

  // ── Lesson ↔ Skill links ─────────────────────────────────────────────────
  const lessonSkills = [
    { lessonId: 'l1000001-0000-0000-0000-000000000001', skillId: SKILL_IDS.TYPESCRIPT, weight: 1 },
    { lessonId: 'l1000001-0000-0000-0000-000000000002', skillId: SKILL_IDS.TYPESCRIPT, weight: 1.5 },
    { lessonId: 'l1000001-0000-0000-0000-000000000003', skillId: SKILL_IDS.TYPESCRIPT, weight: 1.5 },
    { lessonId: 'l2000001-0000-0000-0000-000000000001', skillId: SKILL_IDS.NESTJS,     weight: 1 },
    { lessonId: 'l2000001-0000-0000-0000-000000000002', skillId: SKILL_IDS.NESTJS,     weight: 1.5 },
    { lessonId: 'l2000001-0000-0000-0000-000000000004', skillId: SKILL_IDS.DATABASE,   weight: 1.5 },
    { lessonId: 'l3000001-0000-0000-0000-000000000001', skillId: SKILL_IDS.DOCKER,     weight: 1 },
    { lessonId: 'l3000001-0000-0000-0000-000000000002', skillId: SKILL_IDS.DOCKER,     weight: 1.5 },
  ];
  for (const ls of lessonSkills) {
    await prisma.lessonSkill.upsert({
      where:  { lessonId_skillId: { lessonId: ls.lessonId, skillId: ls.skillId } },
      update: {},
      create: { id: `ls-${ls.lessonId.slice(-4)}-${ls.skillId.slice(-4)}`, ...ls },
    });
  }
  console.log('  ✓ lesson-skill mappings');

  console.log('\nCourse IDs for reference:');
  console.log('  COURSE_1 (TypeScript):', C.COURSE_1);
  console.log('  COURSE_2 (NestJS):    ', C.COURSE_2);
  console.log('  COURSE_3 (Docker):    ', C.COURSE_3);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
