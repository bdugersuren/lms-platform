UPDATE "user_profiles" SET "tenant_id" = 'demo' WHERE "tenant_id" IS NULL;

ALTER TABLE "user_profiles"
  ALTER COLUMN "tenant_id" SET DEFAULT 'demo',
  ALTER COLUMN "tenant_id" SET NOT NULL;
