-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('LOCKED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "enrollments" (
    "id"               TEXT NOT NULL,
    "course_id"        TEXT NOT NULL,
    "student_id"       TEXT NOT NULL,
    "progress_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_score"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed"        BOOLEAN NOT NULL DEFAULT false,
    "enrolled_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at"     TIMESTAMP(3),

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progresses" (
    "id"               TEXT NOT NULL,
    "enrollment_id"    TEXT NOT NULL,
    "lesson_id"        TEXT NOT NULL,
    "status"           "ProgressStatus" NOT NULL DEFAULT 'LOCKED',
    "progress_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score"            DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed"        BOOLEAN NOT NULL DEFAULT false,
    "unlocked_at"      TIMESTAMP(3),
    "completed_at"     TIMESTAMP(3),
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_course_id_student_id_key" ON "enrollments"("course_id", "student_id");
CREATE INDEX "enrollments_student_id_idx" ON "enrollments"("student_id");
CREATE INDEX "enrollments_course_id_idx" ON "enrollments"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progresses_enrollment_id_lesson_id_key" ON "lesson_progresses"("enrollment_id", "lesson_id");
CREATE INDEX "lesson_progresses_enrollment_id_idx" ON "lesson_progresses"("enrollment_id");

-- AddForeignKey
ALTER TABLE "lesson_progresses" ADD CONSTRAINT "lesson_progresses_enrollment_id_fkey"
    FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
