import { PrismaClient, MessageRole } from '@prisma/client';

const prisma = new PrismaClient();

const U = {
  STUDENT_1: 'a0000001-0000-0000-0000-000000000005',
  STUDENT_2: 'a0000001-0000-0000-0000-000000000006',
  STUDENT_3: 'a0000001-0000-0000-0000-000000000007',
};

const C = {
  COURSE_1: 'c0000001-0000-0000-0000-000000000001',
  COURSE_2: 'c0000001-0000-0000-0000-000000000002',
  COURSE_3: 'c0000001-0000-0000-0000-000000000003',
};

async function main() {
  console.log('Seeding ai-service...');

  // ── AI Tutor Chat Sessions ─────────────────────────────────────────────────
  const session1Id = 'ai-sess1-0000-0000-0000-000000000001';
  await prisma.chatSession.upsert({
    where:  { id: session1Id },
    update: {},
    create: {
      id: session1Id,
      userId: U.STUDENT_1,
      courseId: C.COURSE_1,
      title: 'TypeScript Generic type асуулт',
    },
  });

  const messages1 = [
    {
      id: 'ai-msg01-0000-0000-0000-000000000001',
      sessionId: session1Id,
      role: MessageRole.user,
      content: 'Generic type гэж яг юу вэ? Жишээгээр тайлбарлаач.',
    },
    {
      id: 'ai-msg01-0000-0000-0000-000000000002',
      sessionId: session1Id,
      role: MessageRole.assistant,
      content: 'Generic type нь функц, класс, интерфейсийг ямар ч өгөгдлийн төрөлд ажиллах боломжтой болгодог механизм юм.\n\nЖишээ:\n```typescript\nfunction identity<T>(arg: T): T {\n  return arg;\n}\n\nconst num = identity<number>(42);   // T = number\nconst str = identity<string>("hi"); // T = string\n```\n\n`T` нь type parameter бөгөөд функц дуудахад конкрет төрлөөр солигдоно.',
    },
    {
      id: 'ai-msg01-0000-0000-0000-000000000003',
      sessionId: session1Id,
      role: MessageRole.user,
      content: 'Array-д яаж ашигладаг вэ?',
    },
    {
      id: 'ai-msg01-0000-0000-0000-000000000004',
      sessionId: session1Id,
      role: MessageRole.assistant,
      content: 'Array-д Generic type-г ингэж ашигладаг:\n\n```typescript\nfunction firstItem<T>(arr: T[]): T | undefined {\n  return arr[0];\n}\n\nconst first = firstItem([1, 2, 3]);      // number | undefined\nconst name  = firstItem(["Alice", "Bob"]); // string | undefined\n```\n\nArray<T> эсвэл T[] хоёр аль аль нь адилхан утгатай.',
    },
  ];

  for (const m of messages1) {
    await prisma.chatMessage.upsert({
      where:  { id: m.id },
      update: {},
      create: m,
    });
  }
  console.log('  ✓ 1 chat session (4 messages)');

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations = [
    // student2 (зөвхөн course1 суралцсан) → course2 санал болгох
    {
      id: 'ai-rec001-0000-0000-0000-000000000001',
      userId: U.STUDENT_2,
      courseId: C.COURSE_2,
      reason: 'TypeScript Fundamentals дуусгасны дараа NestJS Backend сурах нь логик дараалал. TypeScript мэдлэгтэй тул энэ сургалт танд тохиромжтой.',
      score: 0.92,
    },
    {
      id: 'ai-rec001-0000-0000-0000-000000000002',
      userId: U.STUDENT_2,
      courseId: C.COURSE_3,
      reason: 'Backend хөгжүүлэлт сурч байгаа тул Docker ба DevOps мэдлэг чухал. Хоёр дахь нэн тэргүүний санал.',
      score: 0.78,
    },
    // student3 (course3 суралцаж байгаа) → course1 санал болгох
    {
      id: 'ai-rec001-0000-0000-0000-000000000003',
      userId: U.STUDENT_3,
      courseId: C.COURSE_1,
      reason: 'Docker & DevOps сургалтын script ба automation хэсэгт TypeScript мэдлэг хэрэгтэй болно.',
      score: 0.65,
    },
  ];

  for (const r of recommendations) {
    await prisma.recommendation.upsert({
      where:  { id: r.id },
      update: {},
      create: r,
    });
  }
  console.log('  ✓ 3 recommendations');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
