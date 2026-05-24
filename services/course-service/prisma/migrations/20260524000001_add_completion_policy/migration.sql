-- AddColumn: completion policy fields to courses table
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "require_quiz_pass" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "require_assignment_pass" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "minimum_score_percent" INTEGER NOT NULL DEFAULT 0;
