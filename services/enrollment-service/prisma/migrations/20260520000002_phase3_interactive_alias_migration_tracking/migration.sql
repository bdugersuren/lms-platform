-- Phase 3: Interactive progress ownership, enrollment alias, and migration tracking.
-- Additive only — zero data loss. Legacy tables in course-service remain untouched.

-- ─── interactive_block_progresses ────────────────────────────────────────────

CREATE TABLE "interactive_block_progresses" (
    "id"                    TEXT NOT NULL,
    "lesson_progress_id"    TEXT NOT NULL,
    "interactive_block_id"  TEXT NOT NULL,
    "score"                 DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passed"                BOOLEAN NOT NULL DEFAULT false,
    "completed"             BOOLEAN NOT NULL DEFAULT false,
    "attempts"              INTEGER NOT NULL DEFAULT 0,
    "started_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at"          TIMESTAMP(3),

    CONSTRAINT "interactive_block_progresses_pkey" PRIMARY KEY ("id")
);

-- ─── interactive_answers ─────────────────────────────────────────────────────

CREATE TABLE "interactive_answers" (
    "id"                            TEXT NOT NULL,
    "interactive_block_progress_id" TEXT NOT NULL,
    "question_id"                   TEXT NOT NULL,
    "answer_text"                   TEXT,
    "selected_option_ids"           JSONB,
    "is_correct"                    BOOLEAN,
    "score_awarded"                 DOUBLE PRECISION NOT NULL DEFAULT 0,
    "answered_at"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactive_answers_pkey" PRIMARY KEY ("id")
);

-- ─── enrollment_aliases ──────────────────────────────────────────────────────
-- Maps course-service CourseEnrollment.id → enrollment-service Enrollment.id.
-- Populated by migrate-phase3.ts; used for reconciliation and cross-service debugging.

CREATE TABLE "enrollment_aliases" (
    "id"                    TEXT NOT NULL,
    "enrollment_service_id" TEXT NOT NULL,
    "course_service_id"     TEXT NOT NULL,
    "migrated_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_aliases_pkey" PRIMARY KEY ("id")
);

-- ─── migration_runs ──────────────────────────────────────────────────────────
-- Tracks each execution of the migration scripts for observability and resumability.

CREATE TABLE "migration_runs" (
    "id"            TEXT NOT NULL,
    "run_type"      TEXT NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'running',
    "total_rows"    INTEGER NOT NULL DEFAULT 0,
    "migrated_rows" INTEGER NOT NULL DEFAULT 0,
    "skipped_rows"  INTEGER NOT NULL DEFAULT 0,
    "error_rows"    INTEGER NOT NULL DEFAULT 0,
    "started_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at"  TIMESTAMP(3),
    "error_detail"  TEXT,
    "checksum"      TEXT,

    CONSTRAINT "migration_runs_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "interactive_block_progresses_lesson_progress_id_interactive_block_id_key"
    ON "interactive_block_progresses"("lesson_progress_id", "interactive_block_id");
CREATE INDEX "interactive_block_progresses_lesson_progress_id_idx"
    ON "interactive_block_progresses"("lesson_progress_id");

CREATE INDEX "interactive_answers_question_id_idx"
    ON "interactive_answers"("question_id");
CREATE INDEX "interactive_answers_interactive_block_progress_id_idx"
    ON "interactive_answers"("interactive_block_progress_id");

CREATE UNIQUE INDEX "enrollment_aliases_enrollment_service_id_key"
    ON "enrollment_aliases"("enrollment_service_id");
CREATE UNIQUE INDEX "enrollment_aliases_course_service_id_key"
    ON "enrollment_aliases"("course_service_id");

CREATE INDEX "migration_runs_run_type_status_idx"
    ON "migration_runs"("run_type", "status");

-- ─── Foreign keys ─────────────────────────────────────────────────────────────

ALTER TABLE "interactive_block_progresses"
    ADD CONSTRAINT "interactive_block_progresses_lesson_progress_id_fkey"
    FOREIGN KEY ("lesson_progress_id")
    REFERENCES "lesson_progresses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interactive_answers"
    ADD CONSTRAINT "interactive_answers_interactive_block_progress_id_fkey"
    FOREIGN KEY ("interactive_block_progress_id")
    REFERENCES "interactive_block_progresses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
