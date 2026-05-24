ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT 'demo';

CREATE INDEX IF NOT EXISTS "payments_tenant_id_idx" ON "payments"("tenant_id");
