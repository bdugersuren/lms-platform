-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
-- WALLET_TOPUP, ADMIN_ADJUSTMENT нь 20260523000001 migration-д нэмэгдэнэ
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT', 'REVENUE_SHARE', 'PAYOUT', 'REFUND', 'PLATFORM_FEE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "wallets" (
    "id"         TEXT NOT NULL,
    "owner_id"   TEXT NOT NULL,
    "owner_type" TEXT NOT NULL DEFAULT 'USER',
    "balance"    DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency"   TEXT NOT NULL DEFAULT 'MNT',
    "status"     "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- reference unique index нь 20260523000001 migration-д нэмэгдэнэ
CREATE TABLE "transactions" (
    "id"             TEXT NOT NULL,
    "wallet_id"      TEXT NOT NULL,
    "type"           "TransactionType" NOT NULL,
    "status"         "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount"         DECIMAL(18,2) NOT NULL,
    "balance_before" DECIMAL(18,2) NOT NULL,
    "balance_after"  DECIMAL(18,2) NOT NULL,
    "currency"       TEXT NOT NULL DEFAULT 'MNT',
    "description"    TEXT,
    "reference"      TEXT,
    "metadata"       JSONB,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_shares" (
    "id"            TEXT NOT NULL,
    "wallet_id"     TEXT NOT NULL,
    "course_id"     TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "gross_amount"  DECIMAL(18,2) NOT NULL,
    "platform_fee"  DECIMAL(18,2) NOT NULL,
    "net_amount"    DECIMAL(18,2) NOT NULL,
    "fee_percent"   DECIMAL(5,2) NOT NULL,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id"              TEXT NOT NULL,
    "wallet_id"       TEXT NOT NULL,
    "amount"          DECIMAL(18,2) NOT NULL,
    "currency"        TEXT NOT NULL DEFAULT 'MNT',
    "status"          "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "bank_name"       TEXT,
    "account_number"  TEXT,
    "account_name"    TEXT,
    "note"            TEXT,
    "processed_at"    TIMESTAMP(3),
    "rejected_reason" TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_owner_id_key" ON "wallets"("owner_id");
CREATE INDEX "wallets_owner_id_idx" ON "wallets"("owner_id");

-- CreateIndex
CREATE INDEX "transactions_wallet_id_idx" ON "transactions"("wallet_id");
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_shares_enrollment_id_key" ON "revenue_shares"("enrollment_id");
CREATE INDEX "revenue_shares_wallet_id_idx" ON "revenue_shares"("wallet_id");
CREATE INDEX "revenue_shares_course_id_idx" ON "revenue_shares"("course_id");

-- CreateIndex
CREATE INDEX "payouts_wallet_id_idx" ON "payouts"("wallet_id");
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey"
    FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "revenue_shares" ADD CONSTRAINT "revenue_shares_wallet_id_fkey"
    FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payouts" ADD CONSTRAINT "payouts_wallet_id_fkey"
    FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
