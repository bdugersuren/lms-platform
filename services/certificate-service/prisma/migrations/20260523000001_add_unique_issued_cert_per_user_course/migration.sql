-- Partial unique index: нэг хэрэглэгч нэг курсэд зөвхөн нэг ISSUED certificate авна.
-- REVOKED certificate байвал дахин олгох боломжтой (partial WHERE clause).
-- NULL courseId → курсгүй гэрчилгээ, давхардал зөвшөөрнө.
CREATE UNIQUE INDEX "Certificate_userId_courseId_issued_idx"
    ON "Certificate" ("userId", "courseId")
    WHERE "courseId" IS NOT NULL AND status = 'ISSUED';

-- Composite query performance index
CREATE INDEX "Certificate_userId_courseId_idx"
    ON "Certificate" ("userId", "courseId");
