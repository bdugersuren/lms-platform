-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "courseId" TEXT,
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyKpi" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "newUsers" INTEGER NOT NULL DEFAULT 0,
    "newEnrollments" INTEGER NOT NULL DEFAULT 0,
    "completedCourses" INTEGER NOT NULL DEFAULT 0,
    "confirmedPayments" INTEGER NOT NULL DEFAULT 0,
    "revenueAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quizAttempts" INTEGER NOT NULL DEFAULT 0,
    "avgQuizScore" DOUBLE PRECISION,
    "assignmentSubmissions" INTEGER NOT NULL DEFAULT 0,
    "certificatesIssued" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyKpi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent"("eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_courseId_idx" ON "AnalyticsEvent"("courseId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_occurredAt_idx" ON "AnalyticsEvent"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyKpi_date_key" ON "DailyKpi"("date");

-- CreateIndex
CREATE INDEX "DailyKpi_date_idx" ON "DailyKpi"("date");
