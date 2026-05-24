-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'ADMIN', 'INSTRUCTOR', 'STUDENT');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_mn" TEXT,
    "tagline" TEXT,
    "tagline_mn" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" TEXT NOT NULL DEFAULT 'mn',
    "default_currency" TEXT NOT NULL DEFAULT 'MNT',
    "platform_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_domains" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'STUDENT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_branding" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "logo" TEXT,
    "logo_dark" TEXT,
    "favicon" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#6366f1',
    "secondary_color" TEXT NOT NULL DEFAULT '#8b5cf6',
    "accent_color" TEXT NOT NULL DEFAULT '#06b6d4',
    "font_family" TEXT,
    "dark_mode_enabled" BOOLEAN NOT NULL DEFAULT false,
    "button_style" TEXT NOT NULL DEFAULT 'rounded',
    "card_style" TEXT NOT NULL DEFAULT 'shadow',
    "seo_title" TEXT NOT NULL,
    "seo_description" TEXT NOT NULL,
    "seo_keywords" TEXT,
    "og_image" TEXT,
    "features" JSONB NOT NULL,
    "navigation" JSONB NOT NULL,
    "homepage_sections" JSONB NOT NULL,
    "footer" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_branding_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX "tenants_status_idx" ON "tenants"("status");
CREATE UNIQUE INDEX "tenant_domains_domain_key" ON "tenant_domains"("domain");
CREATE INDEX "tenant_domains_tenant_id_idx" ON "tenant_domains"("tenant_id");
CREATE UNIQUE INDEX "tenant_memberships_tenant_id_user_id_key" ON "tenant_memberships"("tenant_id", "user_id");
CREATE INDEX "tenant_memberships_user_id_idx" ON "tenant_memberships"("user_id");
CREATE INDEX "tenant_memberships_tenant_id_role_idx" ON "tenant_memberships"("tenant_id", "role");
CREATE UNIQUE INDEX "tenant_branding_tenant_id_key" ON "tenant_branding"("tenant_id");

-- Foreign keys
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
