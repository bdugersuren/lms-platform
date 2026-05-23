-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('COURSE_PURCHASE', 'WALLET_TOPUP');

-- AlterTable: courseId optional болгох, purpose болон walletOwnerId нэмэх
ALTER TABLE "payments"
  ADD COLUMN "purpose" "PaymentPurpose" NOT NULL DEFAULT 'COURSE_PURCHASE',
  ADD COLUMN "wallet_owner_id" TEXT,
  ALTER COLUMN "course_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "payments_purpose_idx" ON "payments"("purpose");
