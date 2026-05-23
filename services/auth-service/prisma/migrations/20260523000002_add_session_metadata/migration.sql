-- Migration: add session metadata fields to refresh_tokens
-- Adds: token_id (unique session identifier), device_name, ip_address, user_agent, last_used_at

ALTER TABLE "refresh_tokens"
  ADD COLUMN "token_id"    VARCHAR(36),
  ADD COLUMN "device_name" VARCHAR(255),
  ADD COLUMN "ip_address"  VARCHAR(45),
  ADD COLUMN "user_agent"  TEXT,
  ADD COLUMN "last_used_at" TIMESTAMPTZ;

-- Backfill token_id for existing rows using their id
UPDATE "refresh_tokens" SET "token_id" = "id" WHERE "token_id" IS NULL;

ALTER TABLE "refresh_tokens" ALTER COLUMN "token_id" SET NOT NULL;

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_token_id_key" UNIQUE ("token_id");
