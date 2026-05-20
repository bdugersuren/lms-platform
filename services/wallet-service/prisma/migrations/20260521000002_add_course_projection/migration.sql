-- CreateTable
CREATE TABLE "course_projections" (
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "content_version" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_projections_pkey" PRIMARY KEY ("course_id")
);

-- CreateIndex
CREATE INDEX "course_projections_instructor_id_idx" ON "course_projections"("instructor_id");
