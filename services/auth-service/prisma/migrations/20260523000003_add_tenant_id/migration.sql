ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT 'demo';

CREATE INDEX IF NOT EXISTS "users_tenant_id_idx" ON "users"("tenant_id");
