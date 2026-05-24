CREATE TABLE IF NOT EXISTS "fee_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT 'demo',
    "policy_type" TEXT NOT NULL DEFAULT 'REVENUE_SHARE',
    "currency" TEXT NOT NULL DEFAULT 'MNT',
    "fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fee_policies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "fee_policies_tenant_id_policy_type_is_active_idx"
  ON "fee_policies"("tenant_id", "policy_type", "is_active");

INSERT INTO "fee_policies" (
  "id",
  "tenant_id",
  "policy_type",
  "currency",
  "fee_percent",
  "effective_from",
  "is_active",
  "updated_at"
)
VALUES (
  'fee-demo-revenue-share',
  'demo',
  'REVENUE_SHARE',
  'MNT',
  20,
  CURRENT_TIMESTAMP,
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
