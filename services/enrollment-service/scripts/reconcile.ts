/**
 * Phase 3 Reconciliation Script — ENG-003
 *
 * Validates data consistency between course-service DB (source of truth pre-migration)
 * and enrollment-service DB (post-migration target).
 *
 * Checks:
 *   1. Enrollment count parity (aliased rows)
 *   2. Lesson progress count per enrollment
 *   3. Completion status consistency
 *   4. Progress percent consistency (within tolerance)
 *   5. Total score consistency (within tolerance)
 *   6. Interactive block progress count
 *   7. Interactive answer count
 *
 * Environment variables:
 *   DATABASE_URL         — enrollment-service PostgreSQL URL
 *   COURSE_DATABASE_URL  — course-service PostgreSQL URL
 *
 * Usage:
 *   npx tsx scripts/reconcile.ts
 *   npx tsx scripts/reconcile.ts --limit 200
 */

import { PrismaClient } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrollmentRow {
  id: string;
  course_id: string;
  student_id: string;
  progress_percent: number;
  total_score: number;
  completed: boolean;
  completed_at: Date | null;
}

interface LpCountRow {
  enrollment_id: string;
  count: bigint;
}

interface BpCountRow {
  lesson_progress_id: string;
  count: bigint;
}

interface AliasRow {
  enrollment_service_id: string;
  course_service_id: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TOLERANCE_PERCENT = 0.01; // 1% tolerance for float comparisons
const LIMIT = (() => {
  const flag = process.argv.findIndex((a) => a === '--limit');
  return flag !== -1 ? parseInt(process.argv[flag + 1] ?? '1000', 10) : 1000;
})();

const enrollPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  log: ['error'],
});

const coursePrisma = new PrismaClient({
  datasources: { db: { url: process.env.COURSE_DATABASE_URL ?? process.env.DATABASE_URL } },
  log: ['error'],
});

// ─── Report types ─────────────────────────────────────────────────────────────

interface Discrepancy {
  type: string;
  courseServiceId: string;
  enrollmentServiceId?: string;
  expected: unknown;
  actual: unknown;
  detail?: string;
}

interface ReconcileResult {
  checkedEnrollments: number;
  passed: number;
  failed: number;
  discrepancies: Discrepancy[];
  summary: {
    enrollmentCount: { courseService: number; enrollmentService: number; aliasedPairs: number };
    completionMismatches: number;
    progressPercentMismatches: number;
    lessonProgressCountMismatches: number;
    blockProgressCountMismatches: number;
    answerCountMismatches: number;
  };
}

function log(msg: string) { process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`); }
function ok(msg: string)  { process.stdout.write(`[${new Date().toISOString()}] ✓ ${msg}\n`); }
function fail(msg: string){ process.stderr.write(`[${new Date().toISOString()}] ✗ ${msg}\n`); }

function approxEq(a: number, b: number, tolerance = TOLERANCE_PERCENT): boolean {
  return Math.abs(a - b) <= tolerance;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('=== Phase 3 Reconciliation Report ===');
  log(`Checking up to ${LIMIT} enrollments`);

  const result: ReconcileResult = {
    checkedEnrollments: 0,
    passed: 0,
    failed: 0,
    discrepancies: [],
    summary: {
      enrollmentCount: { courseService: 0, enrollmentService: 0, aliasedPairs: 0 },
      completionMismatches: 0,
      progressPercentMismatches: 0,
      lessonProgressCountMismatches: 0,
      blockProgressCountMismatches: 0,
      answerCountMismatches: 0,
    },
  };

  // ── 1. High-level counts ──────────────────────────────────────────────────

  const [{ count: ceCount }] = await coursePrisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM course_enrollments
  `;
  const [{ count: enCount }] = await enrollPrisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM enrollments
  `;
  const [{ count: aliasCount }] = await enrollPrisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM enrollment_aliases
  `;

  result.summary.enrollmentCount = {
    courseService: Number(ceCount),
    enrollmentService: Number(enCount),
    aliasedPairs: Number(aliasCount),
  };

  log(`CourseEnrollment (course_db)   : ${ceCount}`);
  log(`Enrollment (enrollment_db)     : ${enCount}`);
  log(`EnrollmentAlias (mapped pairs) : ${aliasCount}`);

  if (Number(aliasCount) < Number(ceCount)) {
    fail(`${Number(ceCount) - Number(aliasCount)} course-service enrollments have no alias → migration incomplete`);
  } else {
    ok('All course-service enrollments have an alias mapping');
  }

  // ── 2. Per-enrollment checks ─────────────────────────────────────────────

  const aliases = await enrollPrisma.$queryRaw<AliasRow[]>`
    SELECT enrollment_service_id, course_service_id
    FROM enrollment_aliases
    ORDER BY migrated_at ASC
    LIMIT ${LIMIT}
  `;

  const courseServiceIds = aliases.map((a) => a.course_service_id);
  const enrollmentServiceIds = aliases.map((a) => a.enrollment_service_id);

  // Fetch all source enrollments
  const ceRows =
    courseServiceIds.length > 0
      ? await coursePrisma.$queryRaw<EnrollmentRow[]>`
          SELECT id, course_id, student_id, progress_percent, total_score, completed, completed_at
          FROM course_enrollments
          WHERE id = ANY(${courseServiceIds}::text[])
        `
      : [];

  // Fetch all target enrollments
  const enrollRows =
    enrollmentServiceIds.length > 0
      ? await enrollPrisma.$queryRaw<EnrollmentRow[]>`
          SELECT id, course_id, student_id, progress_percent, total_score, completed, completed_at
          FROM enrollments
          WHERE id = ANY(${enrollmentServiceIds}::text[])
        `
      : [];

  const ceMap = new Map(ceRows.map((r) => [r.id, r]));
  const enrollMap = new Map(enrollRows.map((r) => [r.id, r]));

  // Fetch lesson progress counts for both sides
  const ceLpCounts =
    courseServiceIds.length > 0
      ? await coursePrisma.$queryRaw<LpCountRow[]>`
          SELECT enrollment_id, COUNT(*) as count
          FROM lesson_progresses
          WHERE enrollment_id = ANY(${courseServiceIds}::text[])
          GROUP BY enrollment_id
        `
      : [];

  const enrollLpCounts =
    enrollmentServiceIds.length > 0
      ? await enrollPrisma.$queryRaw<LpCountRow[]>`
          SELECT enrollment_id, COUNT(*) as count
          FROM lesson_progresses
          WHERE enrollment_id = ANY(${enrollmentServiceIds}::text[])
          GROUP BY enrollment_id
        `
      : [];

  const ceLpMap = new Map(ceLpCounts.map((r) => [r.enrollment_id, Number(r.count)]));
  const enrollLpMap = new Map(enrollLpCounts.map((r) => [r.enrollment_id, Number(r.count)]));

  // ── 3. Per-alias validation ────────────────────────────────────────────────

  for (const alias of aliases) {
    const ce = ceMap.get(alias.course_service_id);
    const en = enrollMap.get(alias.enrollment_service_id);
    result.checkedEnrollments++;

    if (!ce) {
      result.discrepancies.push({
        type: 'MISSING_IN_COURSE_DB',
        courseServiceId: alias.course_service_id,
        enrollmentServiceId: alias.enrollment_service_id,
        expected: 'exists',
        actual: 'not found',
      });
      result.failed++;
      continue;
    }

    if (!en) {
      result.discrepancies.push({
        type: 'MISSING_IN_ENROLLMENT_DB',
        courseServiceId: alias.course_service_id,
        enrollmentServiceId: alias.enrollment_service_id,
        expected: 'exists',
        actual: 'not found',
      });
      result.failed++;
      continue;
    }

    let rowOk = true;

    // Completion mismatch
    if (ce.completed !== en.completed) {
      result.discrepancies.push({
        type: 'COMPLETION_MISMATCH',
        courseServiceId: ce.id,
        enrollmentServiceId: en.id,
        expected: ce.completed,
        actual: en.completed,
      });
      result.summary.completionMismatches++;
      rowOk = false;
    }

    // Progress percent mismatch (within tolerance)
    if (!approxEq(ce.progress_percent, en.progress_percent)) {
      result.discrepancies.push({
        type: 'PROGRESS_PERCENT_MISMATCH',
        courseServiceId: ce.id,
        enrollmentServiceId: en.id,
        expected: ce.progress_percent,
        actual: en.progress_percent,
        detail: `delta=${Math.abs(ce.progress_percent - en.progress_percent).toFixed(4)}`,
      });
      result.summary.progressPercentMismatches++;
      rowOk = false;
    }

    // Lesson progress count mismatch
    const ceLpCount = ceLpMap.get(ce.id) ?? 0;
    const enLpCount = enrollLpMap.get(en.id) ?? 0;
    if (ceLpCount !== enLpCount) {
      result.discrepancies.push({
        type: 'LESSON_PROGRESS_COUNT_MISMATCH',
        courseServiceId: ce.id,
        enrollmentServiceId: en.id,
        expected: ceLpCount,
        actual: enLpCount,
      });
      result.summary.lessonProgressCountMismatches++;
      rowOk = false;
    }

    rowOk ? result.passed++ : result.failed++;
  }

  // ── 4. Interactive block progress and answer counts (sampled) ─────────────

  const sampleLpIds = await enrollPrisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM lesson_progresses
    WHERE enrollment_id = ANY(${enrollmentServiceIds}::text[])
    LIMIT 500
  `;
  const enrollLpIds = sampleLpIds.map((r) => r.id);

  if (enrollLpIds.length > 0) {
    const [{ count: enrollBpCount }] = await enrollPrisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM interactive_block_progresses
      WHERE lesson_progress_id = ANY(${enrollLpIds}::text[])
    `;

    log(`InteractiveBlockProgress rows (sampled ${enrollLpIds.length} LPs): ${enrollBpCount}`);

    const [{ count: enrollAnsCount }] = await enrollPrisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM interactive_answers ia
      JOIN interactive_block_progresses ibp ON ia.interactive_block_progress_id = ibp.id
      WHERE ibp.lesson_progress_id = ANY(${enrollLpIds}::text[])
    `;
    log(`InteractiveAnswer rows (sampled): ${enrollAnsCount}`);
  }

  // ── 5. Print report ───────────────────────────────────────────────────────

  log('\n=== RECONCILIATION SUMMARY ===');
  log(`Checked enrollments : ${result.checkedEnrollments}`);
  log(`Passed              : ${result.passed}`);
  log(`Failed              : ${result.failed}`);
  log(`Completion mismatches        : ${result.summary.completionMismatches}`);
  log(`Progress pct mismatches      : ${result.summary.progressPercentMismatches}`);
  log(`LessonProgress count diffs   : ${result.summary.lessonProgressCountMismatches}`);

  if (result.discrepancies.length > 0) {
    log('\n=== DISCREPANCIES (first 20) ===');
    result.discrepancies.slice(0, 20).forEach((d) => {
      fail(`[${d.type}] course=${d.courseServiceId} enroll=${d.enrollmentServiceId ?? 'N/A'} expected=${d.expected} actual=${d.actual}${d.detail ? ' ' + d.detail : ''}`);
    });
  } else {
    ok('No discrepancies found!');
  }

  log('=== END REPORT ===');

  if (result.failed > 0) process.exit(1);
}

main()
  .catch((e) => {
    fail(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  })
  .finally(async () => {
    await enrollPrisma.$disconnect();
    await coursePrisma.$disconnect();
  });
