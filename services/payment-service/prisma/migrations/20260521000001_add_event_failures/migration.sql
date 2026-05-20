-- CreateTable
CREATE TABLE "event_failures" (
    "id" TEXT NOT NULL,
    "event_id" TEXT,
    "event_type" TEXT NOT NULL,
    "consumer" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error_msg" TEXT NOT NULL,
    "stack_trace" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_failures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_failures_event_type_idx" ON "event_failures"("event_type");

-- CreateIndex
CREATE INDEX "event_failures_resolved_at_idx" ON "event_failures"("resolved_at");
