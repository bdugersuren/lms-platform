-- AlterEnum: TransactionType дотор шинэ утгууд нэмэх
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'WALLET_TOPUP';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'ADMIN_ADJUSTMENT';

-- AlterTable: reference дээр unique constraint нэмэх
-- Давхардсан reference байж болзошгүй тул эхлээд NULL-уудыг хасна
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_reference_key" ON "transactions"("reference") WHERE "reference" IS NOT NULL;
