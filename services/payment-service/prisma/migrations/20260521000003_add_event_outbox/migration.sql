-- CreateTable
CREATE TABLE "event_outbox" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_outbox_event_id_key" ON "event_outbox"("event_id");

-- CreateIndex
CREATE INDEX "event_outbox_event_type_idx" ON "event_outbox"("event_type");

-- CreateIndex
CREATE INDEX "event_outbox_aggregate_type_aggregate_id_idx" ON "event_outbox"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "event_outbox_published_at_occurred_at_idx" ON "event_outbox"("published_at", "occurred_at");
