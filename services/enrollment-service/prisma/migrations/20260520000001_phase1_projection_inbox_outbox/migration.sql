-- Phase 1/2 foundation: course projections and inbox/outbox reliability tables.
-- Additive only; canonical enrollment/progress tables remain unchanged.

CREATE TABLE "course_projections" (
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "is_sequential" BOOLEAN NOT NULL DEFAULT true,
    "total_lessons" INTEGER NOT NULL DEFAULT 0,
    "total_minutes" INTEGER NOT NULL DEFAULT 0,
    "content_version" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_projections_pkey" PRIMARY KEY ("course_id")
);

CREATE TABLE "module_projections" (
    "module_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "content_version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_projections_pkey" PRIMARY KEY ("module_id")
);

CREATE TABLE "lesson_projections" (
    "lesson_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "lesson_type" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "passing_score" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "unlock_next_on_pass" BOOLEAN NOT NULL DEFAULT true,
    "content_version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_projections_pkey" PRIMARY KEY ("lesson_id")
);

CREATE TABLE "event_inbox" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "content_version" INTEGER,
    "payload_hash" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_inbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_outbox" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "course_projections_status_idx" ON "course_projections"("status");
CREATE INDEX "course_projections_instructor_id_idx" ON "course_projections"("instructor_id");

CREATE INDEX "module_projections_course_id_idx" ON "module_projections"("course_id");
CREATE INDEX "module_projections_course_id_sort_order_idx" ON "module_projections"("course_id", "sort_order");

CREATE INDEX "lesson_projections_course_id_idx" ON "lesson_projections"("course_id");
CREATE INDEX "lesson_projections_module_id_idx" ON "lesson_projections"("module_id");
CREATE INDEX "lesson_projections_course_id_sort_order_idx" ON "lesson_projections"("course_id", "sort_order");

CREATE UNIQUE INDEX "event_inbox_event_id_key" ON "event_inbox"("event_id");
CREATE INDEX "event_inbox_event_type_idx" ON "event_inbox"("event_type");
CREATE INDEX "event_inbox_aggregate_type_aggregate_id_idx" ON "event_inbox"("aggregate_type", "aggregate_id");
CREATE INDEX "event_inbox_processed_at_idx" ON "event_inbox"("processed_at");

CREATE UNIQUE INDEX "event_outbox_event_id_key" ON "event_outbox"("event_id");
CREATE INDEX "event_outbox_event_type_idx" ON "event_outbox"("event_type");
CREATE INDEX "event_outbox_aggregate_type_aggregate_id_idx" ON "event_outbox"("aggregate_type", "aggregate_id");
CREATE INDEX "event_outbox_published_at_occurred_at_idx" ON "event_outbox"("published_at", "occurred_at");

ALTER TABLE "module_projections"
  ADD CONSTRAINT "module_projections_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "course_projections"("course_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_projections"
  ADD CONSTRAINT "lesson_projections_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "course_projections"("course_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_projections"
  ADD CONSTRAINT "lesson_projections_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "module_projections"("module_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
