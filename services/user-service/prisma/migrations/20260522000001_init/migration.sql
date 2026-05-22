-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "display_name" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "avatar_url" TEXT,
    "bio" TEXT,
    "headline" VARCHAR(160),
    "expertise" TEXT[],
    "learning_goals" TEXT[],
    "locale" TEXT NOT NULL DEFAULT 'mn',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ulaanbaatar',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_profiles_tenant_id_idx" ON "user_profiles"("tenant_id");

