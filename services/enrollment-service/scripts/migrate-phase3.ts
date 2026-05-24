/**
 * Phase 3 Migration Script — ENG-003
 *
 * Migrates CourseEnrollment, LessonProgress, InteractiveBlockProgress,
 * and InteractiveAnswer from course-service DB into enrollment-service DB.
 *
 * Requirements:
 *   - Zero data loss (reads from course_db, writes to enrollment_db)
 *   - Idempotent (safe to run multiple times)
 *   - Resumable (skips already-migrated rows via EnrollmentAlias)
 *   - Retry-safe (transactional per enrollment)
 *   - Detailed logging
 *
 * Environment variables:
 *   DATABASE_URL          — enrollment-service PostgreSQL URL (target)
 *   COURSE_DATABASE_URL   — course-service PostgreSQL URL (source)
 *
 * Usage:
 *   npx tsx scripts/migrate-phase3.ts
 *   # or dry-run:
 *   DRY_RUN=true npx tsx scripts/migrate-phase3.ts
 */

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

// ─── Types for course_db raw queries ─────────────────────────────────────────

interface CourseEnrollmentRow {
  id: string;
  tenant_id: string | null;
  course_id: string;
  student_id: string;
  progress_percent: number;
  total_score: number;
  completed: boolean;
  enrolled_at: Date;
  completed_at: Date | null;
}

interface LessonProgressRow {
  id: string;
  enrollment_id: string;
  lesson_id: string;
  status: string;
  progress_percent: number;
  score: number;
  completed: boolean;
  unlocked_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface InteractiveBlockProgressRow {
  id: string;
  lesson_progress_id: string;
  interactive_block_id: string;
  score: number;
  passed: boolean;
  completed: boolean;
  attempts: number;
  started_at: Date;
  completed_at: Date | null;
}

interface InteractiveAnswerRow {
  id: string;
  interactive_block_progress_id: string;
  question_id: string;
  answer_text: string | null;
  selected_option_ids: unknown;
  is_correct: boolean | null;
  score_awarded: number;
  answered_at: Date;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? '50', 10);
const RUN_TYPE = 'phase3_full';

// enrollment-service Prisma (target DB)
const enrollPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  log: ['error'],
});

// course-service DB — uses raw queries via a second PrismaClient instance
// pointed at course_db. Prisma schema mismatch is acceptable here since we
// only use $queryRaw which bypasses the schema.
const coursePrisma = new PrismaClient({
  datasources: { db: { url: process.env.COURSE_DATABASE_URL ?? process.env.DATABASE_URL } },
  log: ['error'],
});

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`);
}

function warn(msg: string) {
  process.stderr.write(`[${new Date().toISOString()}] WARN  ${msg}\n`);
}

function err(msg: string, e?: unknown) {
  const detail = e instanceof Error ? e.message : String(e ?? '');
  process.stderr.write(`[${new Date().toISOString()}] ERROR ${msg}${detail ? ': ' + detail : ''}\n`);
}

// ─── Checksum helper ─────────────────────────────────────────────────────────

function checksumRow(row: CourseEnrollmentRow): string {
  return createHash('md5')
    .update(`${row.id}|${row.tenant_id ?? 'demo'}|${row.course_id}|${row.student_id}|${row.completed}`)
    .digest('hex');
}

// ─── Main migration logic ─────────────────────────────────────────────────────

async function migrateEnrollmentBatch(
  batch: CourseEnrollmentRow[],
  runId: string,
  counters: { migrated: number; skipped: number; errors: number },
) {
  for (const ce of batch) {
    try {
      // Check if already migrated via alias
      const existingAlias = await enrollPrisma.enrollmentAlias.findUnique({
        where: { courseServiceId: ce.id },
      });
      if (existingAlias) {
        counters.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`DRY_RUN: would migrate CourseEnrollment ${ce.id} (${ce.course_id}, ${ce.student_id})`);
        counters.migrated++;
        continue;
      }

      // Load lesson progresses for this enrollment from course_db
      const lessonProgresses = await coursePrisma.$queryRaw<LessonProgressRow[]>`
        SELECT id, enrollment_id, lesson_id, status, progress_percent, score, completed,
               unlocked_at, completed_at, created_at, updated_at
        FROM lesson_progresses
        WHERE enrollment_id = ${ce.id}
        ORDER BY created_at ASC
      `;

      // Load interactive block progresses
      const lpIds = lessonProgresses.map((lp) => lp.id);
      const blockProgresses: InteractiveBlockProgressRow[] =
        lpIds.length > 0
          ? await coursePrisma.$queryRaw<InteractiveBlockProgressRow[]>`
              SELECT id, lesson_progress_id, interactive_block_id, score, passed, completed,
                     attempts, started_at, completed_at
              FROM interactive_block_progresses
              WHERE lesson_progress_id = ANY(${lpIds}::text[])
            `
          : [];

      // Load interactive answers
      const bpIds = blockProgresses.map((bp) => bp.id);
      const answers: InteractiveAnswerRow[] =
        bpIds.length > 0
          ? await coursePrisma.$queryRaw<InteractiveAnswerRow[]>`
              SELECT id, interactive_block_progress_id, question_id, answer_text,
                     selected_option_ids, is_correct, score_awarded, answered_at
              FROM interactive_answers
              WHERE interactive_block_progress_id = ANY(${bpIds}::text[])
            `
          : [];

      // Migrate everything in a single transaction
      await enrollPrisma.$transaction(async (tx) => {
        const tenantId = ce.tenant_id ?? 'demo';

        // 1. Find or create Enrollment in enrollment-service
        let enrollment = await tx.enrollment.findUnique({
          where: { tenantId_courseId_studentId: { tenantId, courseId: ce.course_id, studentId: ce.student_id } },
        });

        if (!enrollment) {
          enrollment = await tx.enrollment.create({
            data: {
              tenantId,
              courseId: ce.course_id,
              studentId: ce.student_id,
              progressPercent: ce.progress_percent,
              totalScore: ce.total_score,
              completed: ce.completed,
              enrolledAt: ce.enrolled_at,
              completedAt: ce.completed_at,
            },
          });
        }

        // 2. Record alias mapping
        await tx.enrollmentAlias.upsert({
          where: { courseServiceId: ce.id },
          create: {
            enrollmentServiceId: enrollment.id,
            courseServiceId: ce.id,
          },
          update: { enrollmentServiceId: enrollment.id },
        });

        // Build lesson-progress ID map: course_db LP id → enrollment_db LP id
        const lpIdMap = new Map<string, string>();

        // 3. Migrate lesson progresses
        for (const lp of lessonProgresses) {
          const existing = await tx.lessonProgress.findUnique({
            where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lp.lesson_id } },
          });

          if (existing) {
            lpIdMap.set(lp.id, existing.id);
            continue;
          }

          const created = await tx.lessonProgress.create({
            data: {
              enrollmentId: enrollment.id,
              lessonId: lp.lesson_id,
              status: (lp.status as 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED'),
              progressPercent: lp.progress_percent,
              score: lp.score,
              completed: lp.completed,
              unlockedAt: lp.unlocked_at,
              completedAt: lp.completed_at,
              createdAt: lp.created_at,
            },
          });

          lpIdMap.set(lp.id, created.id);
        }

        // Build block-progress ID map
        const bpIdMap = new Map<string, string>();

        // 4. Migrate interactive block progresses
        for (const bp of blockProgresses) {
          const enrollmentLpId = lpIdMap.get(bp.lesson_progress_id);
          if (!enrollmentLpId) {
            warn(`No LP mapping for course_db LP ${bp.lesson_progress_id}, skipping block progress ${bp.id}`);
            continue;
          }

          const existing = await tx.interactiveBlockProgress.findUnique({
            where: {
              lessonProgressId_interactiveBlockId: {
                lessonProgressId: enrollmentLpId,
                interactiveBlockId: bp.interactive_block_id,
              },
            },
          });

          if (existing) {
            bpIdMap.set(bp.id, existing.id);
            continue;
          }

          const created = await tx.interactiveBlockProgress.create({
            data: {
              lessonProgressId: enrollmentLpId,
              interactiveBlockId: bp.interactive_block_id,
              score: bp.score,
              passed: bp.passed,
              completed: bp.completed,
              attempts: bp.attempts,
              startedAt: bp.started_at,
              completedAt: bp.completed_at,
            },
          });

          bpIdMap.set(bp.id, created.id);
        }

        // 5. Migrate interactive answers
        for (const answer of answers) {
          const enrollmentBpId = bpIdMap.get(answer.interactive_block_progress_id);
          if (!enrollmentBpId) {
            warn(`No BP mapping for course_db BP ${answer.interactive_block_progress_id}, skipping answer ${answer.id}`);
            continue;
          }

          // Answers have no unique constraint — check by question+bp combination
          const existingAnswers = await tx.interactiveAnswer.findMany({
            where: {
              interactiveBlockProgressId: enrollmentBpId,
              questionId: answer.question_id,
            },
          });

          if (existingAnswers.length > 0) continue;

          await tx.interactiveAnswer.create({
            data: {
              interactiveBlockProgressId: enrollmentBpId,
              questionId: answer.question_id,
              answerText: answer.answer_text,
              selectedOptionIds: answer.selected_option_ids ?? undefined,
              isCorrect: answer.is_correct,
              scoreAwarded: answer.score_awarded,
              answeredAt: answer.answered_at,
            },
          });
        }

        // 6. Update MigrationRun checksum for this row
        await tx.migrationRun.update({
          where: { id: runId },
          data: {
            migratedRows: { increment: 1 },
            checksum: checksumRow(ce),
          },
        });
      });

      counters.migrated++;
      log(`Migrated enrollment ${ce.id} → enrollment-service (student=${ce.student_id} course=${ce.course_id} lp=${lessonProgresses.length} bp=${blockProgresses.length} ans=${answers.length})`);
    } catch (e) {
      counters.errors++;
      err(`Failed to migrate CourseEnrollment ${ce.id}`, e);
      // Increment error count in migration run (best-effort, outside the failed transaction)
      await enrollPrisma.migrationRun
        .update({ where: { id: runId }, data: { errorRows: { increment: 1 } } })
        .catch(() => {});
    }
  }
}

async function main() {
  log(`=== Phase 3 Migration${DRY_RUN ? ' [DRY RUN]' : ''} ===`);
  log(`ENROLLMENT_DB: ${(process.env.DATABASE_URL ?? '').replace(/:\/\/.*@/, '://***@')}`);
  log(`COURSE_DB:     ${(process.env.COURSE_DATABASE_URL ?? 'SAME AS ENROLLMENT_DB (NOT SET)').replace(/:\/\/.*@/, '://***@')}`);

  if (!process.env.COURSE_DATABASE_URL) {
    warn('COURSE_DATABASE_URL not set — will read from same DB as enrollment-service (useful only for testing)');
  }

  // Count source rows
  const [{ count: totalCount }] = await coursePrisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM course_enrollments
  `;
  const total = Number(totalCount);
  log(`Source: ${total} CourseEnrollment rows in course_db`);

  if (total === 0) {
    log('Nothing to migrate. Exiting.');
    return;
  }

  // Create or resume MigrationRun
  let run = await enrollPrisma.migrationRun.findFirst({
    where: { runType: RUN_TYPE, status: 'running' },
    orderBy: { startedAt: 'desc' },
  });

  if (run) {
    log(`Resuming existing MigrationRun ${run.id} (migrated=${run.migratedRows} skipped=${run.skippedRows} errors=${run.errorRows})`);
  } else {
    run = await enrollPrisma.migrationRun.create({
      data: { runType: RUN_TYPE, totalRows: total },
    });
    log(`Created MigrationRun ${run.id}`);
  }

  const counters = {
    migrated: run.migratedRows,
    skipped: run.skippedRows,
    errors: run.errorRows,
  };

  // Page through course_enrollments
  let offset = 0;

  while (true) {
    const batch = await coursePrisma.$queryRaw<CourseEnrollmentRow[]>`
      SELECT ce.id,
             c.tenant_id,
             ce.course_id,
             ce.student_id,
             ce.progress_percent,
             ce.total_score,
             ce.completed,
             ce.enrolled_at,
             ce.completed_at
      FROM course_enrollments ce
      LEFT JOIN courses c ON c.id = ce.course_id
      ORDER BY ce.enrolled_at ASC
      LIMIT ${BATCH_SIZE} OFFSET ${offset}
    `;

    if (batch.length === 0) break;

    await migrateEnrollmentBatch(batch, run.id, counters);

    // Persist progress after each batch
    await enrollPrisma.migrationRun.update({
      where: { id: run.id },
      data: {
        migratedRows: counters.migrated,
        skippedRows: counters.skipped,
        errorRows: counters.errors,
      },
    });

    log(`Progress: migrated=${counters.migrated} skipped=${counters.skipped} errors=${counters.errors} / total=${total}`);
    offset += BATCH_SIZE;
  }

  const finalStatus = counters.errors > 0 ? 'completed_with_errors' : 'completed';

  await enrollPrisma.migrationRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      migratedRows: counters.migrated,
      skippedRows: counters.skipped,
      errorRows: counters.errors,
    },
  });

  log(`=== Migration ${finalStatus.toUpperCase()} ===`);
  log(`  Total source rows : ${total}`);
  log(`  Migrated          : ${counters.migrated}`);
  log(`  Skipped (dup)     : ${counters.skipped}`);
  log(`  Errors            : ${counters.errors}`);
  log(`  Run ID            : ${run.id}`);
}

main()
  .catch((e) => {
    err('Fatal error in migration', e);
    process.exit(1);
  })
  .finally(async () => {
    await enrollPrisma.$disconnect();
    await coursePrisma.$disconnect();
  });
