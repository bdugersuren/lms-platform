CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'AUDIO', 'IMAGE', 'PDF', 'DOCUMENT', 'OTHER');
CREATE TYPE "MediaStatus" AS ENUM ('UPLOADING', 'READY', 'TRANSCODING', 'FAILED', 'DELETED');
CREATE TYPE "TranscodeStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');
CREATE TYPE "TranscodeFormat" AS ENUM ('MP4_720P', 'MP4_1080P', 'MP4_480P', 'HLS', 'WEBM');

CREATE TABLE "media_files" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT 'demo',
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "size" BIGINT NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'READY',
    "title" TEXT,
    "description" TEXT,
    "duration" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnail" TEXT,
    "bucket" TEXT NOT NULL DEFAULT 'lms-media',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transcode_jobs" (
    "id" TEXT NOT NULL,
    "media_file_id" TEXT NOT NULL,
    "format" "TranscodeFormat" NOT NULL,
    "status" "TranscodeStatus" NOT NULL DEFAULT 'PENDING',
    "output_key" TEXT,
    "output_url" TEXT,
    "error_msg" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transcode_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subtitles" (
    "id" TEXT NOT NULL,
    "media_file_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'vtt',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subtitles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "media_files_key_key" ON "media_files"("key");
CREATE INDEX "media_files_tenant_id_idx" ON "media_files"("tenant_id");
CREATE INDEX "media_files_user_id_idx" ON "media_files"("user_id");
CREATE INDEX "media_files_media_type_idx" ON "media_files"("media_type");
CREATE INDEX "transcode_jobs_media_file_id_idx" ON "transcode_jobs"("media_file_id");
CREATE INDEX "transcode_jobs_status_idx" ON "transcode_jobs"("status");
CREATE UNIQUE INDEX "subtitles_key_key" ON "subtitles"("key");
CREATE INDEX "subtitles_media_file_id_idx" ON "subtitles"("media_file_id");

ALTER TABLE "transcode_jobs" ADD CONSTRAINT "transcode_jobs_media_file_id_fkey"
  FOREIGN KEY ("media_file_id") REFERENCES "media_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subtitles" ADD CONSTRAINT "subtitles_media_file_id_fkey"
  FOREIGN KEY ("media_file_id") REFERENCES "media_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
