import { PrismaClient, CertificateStatus } from '@prisma/client';

const prisma = new PrismaClient();

const U = {
  STUDENT_1: 'a0000001-0000-0000-0000-000000000005',
};

const C = {
  COURSE_1: 'c0000001-0000-0000-0000-000000000001',
};

async function main() {
  console.log('Seeding certificate-service...');

  // student1 completed course1 → issue certificate
  const certs = [
    {
      id: 'cert0001-0000-0000-0000-000000000001',
      userId: U.STUDENT_1,
      courseId: C.COURSE_1,
      title: 'TypeScript Fundamentals Гэрчилгээ',
      recipientName: 'Оюутан Нэгдүгээр',
      issuerName: 'LMS Platform — Монголын Мэдлэгийн Портал',
      description: 'Энэхүү гэрчилгээ нь TypeScript Fundamentals сургалтыг 92 оноотойгоор амжилттай дүүргэсэн болохыг баталгаажуулна.',
      completedAt: new Date('2026-04-10'),
      issuedAt: new Date('2026-04-10T08:00:00Z'),
      expiresAt: new Date('2028-04-10'),
      status: CertificateStatus.ISSUED,
      verifyCode: 'LMS-CERT-2026-TS-001',
      qrCodeUrl: 'https://storage.lms.mn/lms-media/certs/cert0001-qr.png',
      metadata: {
        courseSlug: 'typescript-fundamentals',
        score: 92,
        totalLessons: 6,
        completedLessons: 6,
        instructorName: 'Багш Нэгдүгээр',
      },
    },
  ];

  for (const cert of certs) {
    await prisma.certificate.upsert({
      where:  { verifyCode: cert.verifyCode },
      update: {},
      create: cert,
    });
  }
  console.log(`  ✓ ${certs.length} certificate(s)`);
  console.log('  Verify URL: /api/certificates/verify/LMS-CERT-2026-TS-001');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
