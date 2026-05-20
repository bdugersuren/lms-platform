/**
 * One-shot bootstrap script: populate wallet-service CourseProjection table from course-service HTTP API.
 * Run BEFORE deploying the new event-driven wallet-service (Phase 3).
 *
 * Usage:
 *   DATABASE_URL=... COURSE_SERVICE_URL=http://course-service:3003 ts-node scripts/populate-course-projections.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const courseServiceUrl = process.env.COURSE_SERVICE_URL ?? 'http://localhost:3003';

interface CourseItem {
  id: string;
  title: string;
  instructorId: string;
  price: string;
  status: string;
  contentVersion?: number;
  publishedAt?: string | null;
}

interface CourseListResponse {
  data: {
    items: CourseItem[];
    meta: { total: number; page: number; limit: number };
  };
}

async function run(): Promise<void> {
  let page = 1;
  const limit = 100;
  let total = 0;
  let upserted = 0;

  console.log(`Populating CourseProjection from ${courseServiceUrl}`);

  do {
    const resp = await axios.get<CourseListResponse>(
      `${courseServiceUrl}/api/courses?status=PUBLISHED&page=${page}&limit=${limit}`,
    );
    const { items, meta } = resp.data.data;
    total = meta.total;

    for (const course of items) {
      await prisma.courseProjection.upsert({
        where: { courseId: course.id },
        create: {
          courseId: course.id,
          title: course.title,
          instructorId: course.instructorId ?? 'unknown',
          price: new Prisma.Decimal(course.price ?? '0'),
          status: course.status,
          contentVersion: course.contentVersion ?? 1,
          publishedAt: course.publishedAt ? new Date(course.publishedAt) : null,
        },
        update: {
          title: course.title,
          instructorId: course.instructorId ?? 'unknown',
          price: new Prisma.Decimal(course.price ?? '0'),
          status: course.status,
          contentVersion: course.contentVersion ?? 1,
          publishedAt: course.publishedAt ? new Date(course.publishedAt) : null,
        },
      });
      upserted++;
    }

    console.log(`Page ${page}: upserted ${items.length} courses (${upserted}/${total})`);
    page++;
  } while ((page - 1) * limit < total);

  console.log(`Done. Total upserted: ${upserted}`);
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
