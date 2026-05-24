ALTER TABLE "Certificate"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT 'demo';

CREATE INDEX IF NOT EXISTS "Certificate_tenant_id_idx" ON "Certificate"("tenant_id");
