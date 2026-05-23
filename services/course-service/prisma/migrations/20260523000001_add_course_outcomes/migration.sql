-- AddColumn: what_you_learn and requirements arrays to courses table
ALTER TABLE "courses" ADD COLUMN "what_you_learn" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "courses" ADD COLUMN "requirements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
