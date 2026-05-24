DROP INDEX IF EXISTS "wallets_owner_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "wallets_tenant_id_owner_id_key"
  ON "wallets"("tenant_id", "owner_id");
