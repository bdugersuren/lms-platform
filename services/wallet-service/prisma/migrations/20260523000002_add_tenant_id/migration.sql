ALTER TABLE "wallets"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT 'demo';

ALTER TABLE "revenue_shares"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT 'demo';

ALTER TABLE "payouts"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT 'demo';

ALTER TABLE "course_projections"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT 'demo';

CREATE INDEX IF NOT EXISTS "wallets_tenant_id_idx" ON "wallets"("tenant_id");
CREATE INDEX IF NOT EXISTS "revenue_shares_tenant_id_idx" ON "revenue_shares"("tenant_id");
CREATE INDEX IF NOT EXISTS "payouts_tenant_id_idx" ON "payouts"("tenant_id");
CREATE INDEX IF NOT EXISTS "course_projections_tenant_id_idx" ON "course_projections"("tenant_id");
