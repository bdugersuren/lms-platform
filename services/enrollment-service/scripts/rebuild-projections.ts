/**
 * Projection Rebuild Script — ENG-003 Phase 4
 *
 * Fetches all PUBLISHED courses from course-service and rebuilds
 * CourseProjection, ModuleProjection, LessonProjection tables in enrollment_db.
 *
 * Environment variables:
 *   DATABASE_URL        — enrollment-service PostgreSQL URL
 *   COURSE_SERVICE_URL  — course-service base URL (default: http://localhost:3003)
 *
 * Usage:
 *   npx tsx scripts/rebuild-projections.ts
 *   DRY_RUN=true npx tsx scripts/rebuild-projections.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios';

const DRY_RUN = process.env.DRY_RUN === 'true';
const BASE_URL = process.env.COURSE_SERVICE_URL ?? 'http://localhost:3003';
const PAGE_SIZE = 50;

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  log: ['error'],
});

function log(msg: string)  { process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`); }
function err_(msg: string) { process.stderr.write(`[${new Date().toISOString()}] ERROR ${msg}\n`); }

interface CourseListItem { id: string; status: string; }
interface LessonFull { id: string; title: string; sortOrder: number; moduleId: string; lessonType: string; passingScore: number; unlockNextOnPass: boolean; }
interface ModuleFull  { id: string; title: string; sortOrder: number; lessons: LessonFull[]; }
interface CourseFull  {
  id: string; title: string; slug: string; instructorId: string;
  price: string; status: string; isSequential: boolean;
  totalLessons: number; totalMinutes: number; contentVersion: number;
  publishedAt: string | null; modules: ModuleFull[];
}

async function fetchPublishedIds(): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  while (true) {
    const resp = await axios.get<{ data: { items: CourseListItem[]; meta: { total: number } } }>(
      `${BASE_URL}/api/courses?status=PUBLISHED&page=${page}&limit=${PAGE_SIZE}`,
    );
    const items = resp.data.data?.items ?? [];
    ids.push(...items.map((c) => c.id));
    if (items.length < PAGE_SIZE) break;
    page++;
  }
  return ids;
}

async function fetchCourse(id: string): Promise<CourseFull> {
  const resp = await axios.get<{ data: CourseFull }>(`${BASE_URL}/api/courses/${id}`);
  return resp.data.data;
}

async function upsertProjection(course: CourseFull): Promise<void> {
  if (DRY_RUN) {
    log(`DRY_RUN: would upsert projection for course=${course.id} (${course.title})`);
    return;
  }

  const contentVersion = course.contentVersion ?? 1;

  await prisma.$transaction(async (tx) => {
    await tx.courseProjection.upsert({
      where: { courseId: course.id },
      create: {
        courseId: course.id,
        title: course.title,
        slug: course.slug,
        instructorId: course.instructorId ?? 'unknown',
        price: new Prisma.Decimal(course.price ?? '0'),
        status: course.status,
        isSequential: course.isSequential,
        totalLessons: course.totalLessons,
        totalMinutes: course.totalMinutes,
        contentVersion,
        publishedAt: course.publishedAt ? new Date(course.publishedAt) : null,
      },
      update: {
        title: course.title,
        slug: course.slug,
        instructorId: course.instructorId ?? 'unknown',
        price: new Prisma.Decimal(course.price ?? '0'),
        status: course.status,
        isSequential: course.isSequential,
        totalLessons: course.totalLessons,
        totalMinutes: course.totalMinutes,
        contentVersion,
        publishedAt: course.publishedAt ? new Date(course.publishedAt) : null,
        deletedAt: null,
      },
    });

    for (const mod of course.modules ?? []) {
      await tx.moduleProjection.upsert({
        where: { moduleId: mod.id },
        create: { moduleId: mod.id, courseId: course.id, title: mod.title, sortOrder: mod.sortOrder, contentVersion },
        update: { courseId: course.id, title: mod.title, sortOrder: mod.sortOrder, contentVersion, deletedAt: null },
      });

      for (const lesson of mod.lessons ?? []) {
        await tx.lessonProjection.upsert({
          where: { lessonId: lesson.id },
          create: {
            lessonId: lesson.id, courseId: course.id, moduleId: mod.id,
            title: lesson.title, lessonType: lesson.lessonType ?? 'TEXT',
            sortOrder: lesson.sortOrder, passingScore: lesson.passingScore ?? 60,
            unlockNextOnPass: lesson.unlockNextOnPass, contentVersion,
          },
          update: {
            courseId: course.id, moduleId: mod.id, title: lesson.title,
            lessonType: lesson.lessonType ?? 'TEXT', sortOrder: lesson.sortOrder,
            passingScore: lesson.passingScore ?? 60, unlockNextOnPass: lesson.unlockNextOnPass,
            contentVersion, deletedAt: null,
          },
        });
      }
    }
  });
}

async function main() {
  log(`=== Projection Rebuild${DRY_RUN ? ' [DRY RUN]' : ''} ===`);
  log(`Course service: ${BASE_URL}`);

  const ids = await fetchPublishedIds();
  log(`Found ${ids.length} published courses`);

  let rebuilt = 0, errors = 0;

  for (const id of ids) {
    try {
      const course = await fetchCourse(id);
      await upsertProjection(course);
      rebuilt++;
      log(`[${rebuilt}/${ids.length}] rebuilt course=${id} (${course.title})`);
    } catch (e) {
      errors++;
      err_(`Failed course=${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  log(`\n=== Rebuild ${errors > 0 ? 'COMPLETED WITH ERRORS' : 'COMPLETE'} ===`);
  log(`  Rebuilt : ${rebuilt}`);
  log(`  Errors  : ${errors}`);
  log(`  Total   : ${ids.length}`);

  if (errors > 0) process.exit(1);
}

main()
  .catch((e) => { err_(String(e)); process.exit(1); })
  .finally(() => prisma.$disconnect());
