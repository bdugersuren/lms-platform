-- Drop old tables if they exist (from old schema)
DROP TABLE IF EXISTS "lessons" CASCADE;
DROP TABLE IF EXISTS "modules" CASCADE;
DROP TABLE IF EXISTS "courses" CASCADE;

-- Drop old enums if they exist
DROP TYPE IF EXISTS "ContentType";
DROP TYPE IF EXISTS "CourseLevel";
DROP TYPE IF EXISTS "CourseStatus";
DROP TYPE IF EXISTS "LessonType";
DROP TYPE IF EXISTS "InteractiveBlockType";
DROP TYPE IF EXISTS "QuestionType";
DROP TYPE IF EXISTS "ProgressStatus";

-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'PDF', 'MARKDOWN', 'TEXT', 'LIVE', 'QUIZ');

-- CreateEnum
CREATE TYPE "InteractiveBlockType" AS ENUM ('QUIZ', 'CHECKPOINT', 'INFO', 'ASSIGNMENT', 'AI_PROMPT');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'ORDERING', 'MATCHING', 'SHORT_TEXT');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('LOCKED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable: courses
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "instructor_id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "level" "CourseLevel" NOT NULL DEFAULT 'BEGINNER',
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" TEXT NOT NULL DEFAULT 'mn',
    "total_lessons" INTEGER NOT NULL DEFAULT 0,
    "total_minutes" INTEGER NOT NULL DEFAULT 0,
    "passing_score" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "is_sequential" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: modules
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "unlock_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: lessons
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "lesson_type" "LessonType" NOT NULL DEFAULT 'TEXT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "content_url" TEXT,
    "raw_markdown" TEXT,
    "raw_text" TEXT,
    "estimated_minutes" INTEGER,
    "is_preview" BOOLEAN NOT NULL DEFAULT false,
    "passing_score" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "unlock_next_on_pass" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable: interactive_blocks
CREATE TABLE "interactive_blocks" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "title" TEXT,
    "block_type" "InteractiveBlockType" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "trigger_second" INTEGER,
    "trigger_page" INTEGER,
    "trigger_paragraph" INTEGER,
    "content_json" JSONB NOT NULL DEFAULT '{}',
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "passing_score" DOUBLE PRECISION,
    "unlock_next_content" BOOLEAN NOT NULL DEFAULT true,
    "continue_on_pass_only" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactive_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: interactive_questions
CREATE TABLE "interactive_questions" (
    "id" TEXT NOT NULL,
    "interactive_block_id" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "question_text" TEXT NOT NULL,
    "explanation" TEXT,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactive_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: interactive_question_options
CREATE TABLE "interactive_question_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "interactive_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable: course_enrollments
CREATE TABLE "course_enrollments" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "progress_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: lesson_progresses
CREATE TABLE "lesson_progresses" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'LOCKED',
    "progress_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "unlocked_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: interactive_block_progresses
CREATE TABLE "interactive_block_progresses" (
    "id" TEXT NOT NULL,
    "lesson_progress_id" TEXT NOT NULL,
    "interactive_block_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "interactive_block_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: interactive_answers
CREATE TABLE "interactive_answers" (
    "id" TEXT NOT NULL,
    "interactive_block_progress_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer_text" TEXT,
    "selected_option_ids" JSONB,
    "is_correct" BOOLEAN,
    "score_awarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactive_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: lesson_dependencies
CREATE TABLE "lesson_dependencies" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "required_lesson_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable: skills
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable: lesson_skills
CREATE TABLE "lesson_skills" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "lesson_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");
CREATE INDEX "courses_instructor_id_idx" ON "courses"("instructor_id");
CREATE INDEX "courses_status_idx" ON "courses"("status");
CREATE INDEX "courses_level_idx" ON "courses"("level");

CREATE INDEX "modules_course_id_idx" ON "modules"("course_id");

CREATE INDEX "lessons_module_id_idx" ON "lessons"("module_id");

CREATE INDEX "interactive_blocks_lesson_id_idx" ON "interactive_blocks"("lesson_id");

CREATE INDEX "interactive_questions_interactive_block_id_idx" ON "interactive_questions"("interactive_block_id");

CREATE INDEX "interactive_question_options_question_id_idx" ON "interactive_question_options"("question_id");

CREATE UNIQUE INDEX "course_enrollments_course_id_student_id_key" ON "course_enrollments"("course_id", "student_id");
CREATE INDEX "course_enrollments_student_id_idx" ON "course_enrollments"("student_id");

CREATE UNIQUE INDEX "lesson_progresses_enrollment_id_lesson_id_key" ON "lesson_progresses"("enrollment_id", "lesson_id");
CREATE INDEX "lesson_progresses_lesson_id_idx" ON "lesson_progresses"("lesson_id");

CREATE UNIQUE INDEX "interactive_block_progresses_lesson_progress_id_interactive_block_id_key" ON "interactive_block_progresses"("lesson_progress_id", "interactive_block_id");

CREATE INDEX "interactive_answers_question_id_idx" ON "interactive_answers"("question_id");

CREATE UNIQUE INDEX "lesson_dependencies_lesson_id_required_lesson_id_key" ON "lesson_dependencies"("lesson_id", "required_lesson_id");

CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

CREATE UNIQUE INDEX "lesson_skills_lesson_id_skill_id_key" ON "lesson_skills"("lesson_id", "skill_id");

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interactive_blocks" ADD CONSTRAINT "interactive_blocks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interactive_questions" ADD CONSTRAINT "interactive_questions_interactive_block_id_fkey" FOREIGN KEY ("interactive_block_id") REFERENCES "interactive_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interactive_question_options" ADD CONSTRAINT "interactive_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "interactive_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_progresses" ADD CONSTRAINT "lesson_progresses_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "course_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_progresses" ADD CONSTRAINT "lesson_progresses_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interactive_block_progresses" ADD CONSTRAINT "interactive_block_progresses_lesson_progress_id_fkey" FOREIGN KEY ("lesson_progress_id") REFERENCES "lesson_progresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interactive_block_progresses" ADD CONSTRAINT "interactive_block_progresses_interactive_block_id_fkey" FOREIGN KEY ("interactive_block_id") REFERENCES "interactive_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interactive_answers" ADD CONSTRAINT "interactive_answers_interactive_block_progress_id_fkey" FOREIGN KEY ("interactive_block_progress_id") REFERENCES "interactive_block_progresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interactive_answers" ADD CONSTRAINT "interactive_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "interactive_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_dependencies" ADD CONSTRAINT "lesson_dependencies_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_dependencies" ADD CONSTRAINT "lesson_dependencies_required_lesson_id_fkey" FOREIGN KEY ("required_lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_skills" ADD CONSTRAINT "lesson_skills_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_skills" ADD CONSTRAINT "lesson_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
