-- Certificate-д PENDING төлөв нэмэх.
-- Сургалт дуусмагц гэрчилгээ шууд ISSUED биш PENDING болж,
-- сурагч өөрийн мэдээллийг хянаж баталгаажуулсны дараа ISSUED болно.

ALTER TYPE "CertificateStatus" ADD VALUE IF NOT EXISTS 'PENDING';

-- PENDING cert-ийн давхардлаас сэргийлэх partial unique index.
-- Нэг хэрэглэгч нэг курсэд нэгээс илүү PENDING/ISSUED гэрчилгээтэй байж болохгүй.
CREATE UNIQUE INDEX "Certificate_userId_courseId_active_idx"
    ON "Certificate" ("userId", "courseId")
    WHERE "courseId" IS NOT NULL AND status IN ('PENDING', 'ISSUED');
