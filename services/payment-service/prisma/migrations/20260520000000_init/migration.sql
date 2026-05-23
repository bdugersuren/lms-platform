-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('QPAY', 'SOCIAL_PAY', 'MOCK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateTable
-- purpose, wallet_owner_id нь 20260523000001 migration-д нэмэгдэнэ
-- course_id NOT NULL → тэр migration-д DROP NOT NULL болно
CREATE TABLE "payments" (
    "id"           TEXT NOT NULL,
    "user_id"      TEXT NOT NULL,
    "course_id"    TEXT NOT NULL,
    "amount"       DECIMAL(18,2) NOT NULL,
    "currency"     TEXT NOT NULL DEFAULT 'MNT',
    "provider"     "PaymentProvider" NOT NULL,
    "status"       "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "invoice_id"   TEXT,
    "qr_code"      TEXT,
    "qr_image"     TEXT,
    "deep_links"   JSONB,
    "checkout_url" TEXT,
    "external_ref" TEXT,
    "description"  TEXT,
    "metadata"     JSONB,
    "expired_at"   TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id"         TEXT NOT NULL,
    "provider"   TEXT NOT NULL,
    "payment_id" TEXT,
    "event_type" TEXT NOT NULL,
    "payload"    JSONB NOT NULL,
    "processed"  BOOLEAN NOT NULL DEFAULT false,
    "error"      TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoice_id_key" ON "payments"("invoice_id");
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");
CREATE INDEX "payments_course_id_idx" ON "payments"("course_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "webhook_logs_payment_id_idx" ON "webhook_logs"("payment_id");
CREATE INDEX "webhook_logs_provider_idx" ON "webhook_logs"("provider");

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
