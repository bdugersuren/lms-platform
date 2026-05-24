ALTER TABLE "enrollments"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT 'demo';

ALTER TABLE "course_projections"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT 'demo';

CREATE INDEX IF NOT EXISTS "enrollments_tenant_id_idx" ON "enrollments"("tenant_id");
CREATE INDEX IF NOT EXISTS "course_projections_tenant_id_idx" ON "course_projections"("tenant_id");
