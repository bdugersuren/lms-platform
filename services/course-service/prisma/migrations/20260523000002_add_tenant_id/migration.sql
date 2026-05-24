ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT 'demo';

DROP INDEX IF EXISTS "courses_slug_key";

CREATE UNIQUE INDEX IF NOT EXISTS "courses_tenant_id_slug_key" ON "courses"("tenant_id", "slug");
CREATE INDEX IF NOT EXISTS "courses_tenant_id_idx" ON "courses"("tenant_id");
