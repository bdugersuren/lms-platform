-- AlterTable: enrollments дотор payment_id багана нэмэх
-- purpose guard: COURSE_PURCHASE event-аас auto-enrollment-ийн idempotency хангана
ALTER TABLE "enrollments"
  ADD COLUMN IF NOT EXISTS "payment_id" TEXT;

-- CreateIndex: payment_id-аар хурдан хайх
CREATE INDEX IF NOT EXISTS "enrollments_payment_id_idx" ON "enrollments"("payment_id");
