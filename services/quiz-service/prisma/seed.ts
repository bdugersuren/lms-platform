import { PrismaClient, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

const C = {
  COURSE_1: 'c0000001-0000-0000-0000-000000000001',
  COURSE_2: 'c0000001-0000-0000-0000-000000000002',
};

const LESSON_C1 = 'l1000001-0000-0000-0000-000000000003';
const LESSON_C2 = 'l2000001-0000-0000-0000-000000000003';

const QUIZ_1 = 'q0000001-0000-0000-0000-000000000001';
const QUIZ_2 = 'q0000001-0000-0000-0000-000000000002';

async function main() {
  console.log('Seeding quiz-service...');

  // ── Quiz 1 — TypeScript үндэс шалгалт ─────────────────────────────────────
  await prisma.quiz.upsert({
    where: { id: QUIZ_1 },
    update: {},
    create: {
      id: QUIZ_1,
      courseId: C.COURSE_1,
      lessonId: LESSON_C1,
      title: 'TypeScript Үндэс Шалгалт',
      description: 'TypeScript-ийн үндсэн ойлголтуудыг шалгана.',
      passingScore: 70,
      timeLimit: 20,
      maxAttempts: 3,
      isAdaptive: false,
      isPublished: true,
    },
  });

  const q1Questions = [
    {
      id: 'qq00001-0000-0000-0000-000000000001',
      quizId: QUIZ_1,
      questionType: QuestionType.SINGLE_CHOICE,
      questionText: 'TypeScript нь ямар хэлний superset вэ?',
      explanation: 'TypeScript нь JavaScript хэлний superset бөгөөд static type системтэй.',
      score: 2,
      sortOrder: 1,
      options: [
        { id: 'qo00001-0001', optionText: 'JavaScript', isCorrect: true,  sortOrder: 1 },
        { id: 'qo00001-0002', optionText: 'Python',      isCorrect: false, sortOrder: 2 },
        { id: 'qo00001-0003', optionText: 'Java',        isCorrect: false, sortOrder: 3 },
        { id: 'qo00001-0004', optionText: 'C#',          isCorrect: false, sortOrder: 4 },
      ],
    },
    {
      id: 'qq00001-0000-0000-0000-000000000002',
      quizId: QUIZ_1,
      questionType: QuestionType.TRUE_FALSE,
      questionText: 'TypeScript нь browser-д шууд ажилладаг.',
      explanation: 'TypeScript нь эхлээд JavaScript руу compile хийгдэх ёстой.',
      score: 1,
      sortOrder: 2,
      options: [
        { id: 'qo00001-0005', optionText: 'Үнэн',  isCorrect: false, sortOrder: 1 },
        { id: 'qo00001-0006', optionText: 'Худал', isCorrect: true,  sortOrder: 2 },
      ],
    },
    {
      id: 'qq00001-0000-0000-0000-000000000003',
      quizId: QUIZ_1,
      questionType: QuestionType.SINGLE_CHOICE,
      questionText: 'TypeScript-д тодорхойгүй төрлийг илэрхийлэх keyword аль вэ?',
      explanation: '`any` keyword нь ямар ч төрлийн утгыг хүлээж авна.',
      score: 2,
      sortOrder: 3,
      options: [
        { id: 'qo00001-0007', optionText: 'unknown', isCorrect: false, sortOrder: 1 },
        { id: 'qo00001-0008', optionText: 'any',     isCorrect: true,  sortOrder: 2 },
        { id: 'qo00001-0009', optionText: 'void',    isCorrect: false, sortOrder: 3 },
        { id: 'qo00001-0010', optionText: 'never',   isCorrect: false, sortOrder: 4 },
      ],
    },
    {
      id: 'qq00001-0000-0000-0000-000000000004',
      quizId: QUIZ_1,
      questionType: QuestionType.MULTIPLE_CHOICE,
      questionText: 'TypeScript-д ямар primitive төрлүүд байдаг вэ? (бүгдийг сонго)',
      explanation: 'string, number, boolean нь TypeScript-ийн үндсэн primitive төрлүүд.',
      score: 3,
      sortOrder: 4,
      options: [
        { id: 'qo00001-0011', optionText: 'string',  isCorrect: true,  sortOrder: 1 },
        { id: 'qo00001-0012', optionText: 'number',  isCorrect: true,  sortOrder: 2 },
        { id: 'qo00001-0013', optionText: 'boolean', isCorrect: true,  sortOrder: 3 },
        { id: 'qo00001-0014', optionText: 'integer', isCorrect: false, sortOrder: 4 },
      ],
    },
    {
      id: 'qq00001-0000-0000-0000-000000000005',
      quizId: QUIZ_1,
      questionType: QuestionType.SINGLE_CHOICE,
      questionText: 'Interface ба Type alias-ийн ялгаа юу вэ?',
      explanation: 'Interface нь extend хийх боломжтой бөгөөд declaration merging дэмждэг.',
      score: 2,
      sortOrder: 5,
      options: [
        { id: 'qo00001-0015', optionText: 'Ялгаагүй, ижилхэн',                        isCorrect: false, sortOrder: 1 },
        { id: 'qo00001-0016', optionText: 'Interface extend хийх боломжтой',            isCorrect: true,  sortOrder: 2 },
        { id: 'qo00001-0017', optionText: 'Type alias зөвхөн object-д хэрэглэгддэг',  isCorrect: false, sortOrder: 3 },
        { id: 'qo00001-0018', optionText: 'Interface нь compile хийгддэггүй',          isCorrect: false, sortOrder: 4 },
      ],
    },
  ];

  for (const q of q1Questions) {
    const { options, ...questionData } = q;
    await prisma.question.upsert({
      where: { id: q.id },
      update: {},
      create: questionData,
    });
    for (const opt of options) {
      await prisma.questionOption.upsert({
        where: { id: opt.id },
        update: {},
        create: { ...opt, questionId: q.id },
      });
    }
  }
  console.log('  ✓ Quiz 1 (TypeScript) — 5 questions');

  // ── Quiz 2 — NestJS шалгалт ───────────────────────────────────────────────
  await prisma.quiz.upsert({
    where: { id: QUIZ_2 },
    update: {},
    create: {
      id: QUIZ_2,
      courseId: C.COURSE_2,
      lessonId: LESSON_C2,
      title: 'NestJS Үндэс Шалгалт',
      description: 'NestJS framework-ийн үндсэн ойлголтуудыг шалгана.',
      passingScore: 70,
      timeLimit: 15,
      maxAttempts: 3,
      isAdaptive: false,
      isPublished: true,
    },
  });

  const q2Questions = [
    {
      id: 'qq00002-0000-0000-0000-000000000001',
      quizId: QUIZ_2,
      questionType: QuestionType.SINGLE_CHOICE,
      questionText: 'NestJS-д HTTP GET endpoint үүсгэхэд ямар decorator ашигладаг вэ?',
      explanation: '@Get() decorator нь HTTP GET method-той endpoint-г тодорхойлно.',
      score: 2,
      sortOrder: 1,
      options: [
        { id: 'qo00002-0001', optionText: '@Get()',    isCorrect: true,  sortOrder: 1 },
        { id: 'qo00002-0002', optionText: '@Post()',   isCorrect: false, sortOrder: 2 },
        { id: 'qo00002-0003', optionText: '@Route()',  isCorrect: false, sortOrder: 3 },
        { id: 'qo00002-0004', optionText: '@Http()',   isCorrect: false, sortOrder: 4 },
      ],
    },
    {
      id: 'qq00002-0000-0000-0000-000000000002',
      quizId: QUIZ_2,
      questionType: QuestionType.TRUE_FALSE,
      questionText: 'NestJS нь Express болон Fastify аль алиныг дэмждэг.',
      explanation: 'NestJS нь Express (default) болон Fastify adapter-ийг дэмждэг.',
      score: 1,
      sortOrder: 2,
      options: [
        { id: 'qo00002-0005', optionText: 'Үнэн',  isCorrect: true,  sortOrder: 1 },
        { id: 'qo00002-0006', optionText: 'Худал', isCorrect: false, sortOrder: 2 },
      ],
    },
    {
      id: 'qq00002-0000-0000-0000-000000000003',
      quizId: QUIZ_2,
      questionType: QuestionType.SINGLE_CHOICE,
      questionText: '@Injectable() decorator юу хийдэг вэ?',
      explanation: '@Injectable() нь class-г NestJS-ийн DI container-т бүртгэнэ.',
      score: 2,
      sortOrder: 3,
      options: [
        { id: 'qo00002-0007', optionText: 'HTTP route тодорхойлно',           isCorrect: false, sortOrder: 1 },
        { id: 'qo00002-0008', optionText: 'DI container-т бүртгэнэ',          isCorrect: true,  sortOrder: 2 },
        { id: 'qo00002-0009', optionText: 'Middleware болгоно',               isCorrect: false, sortOrder: 3 },
        { id: 'qo00002-0010', optionText: 'Database-тэй холбоно',             isCorrect: false, sortOrder: 4 },
      ],
    },
    {
      id: 'qq00002-0000-0000-0000-000000000004',
      quizId: QUIZ_2,
      questionType: QuestionType.MULTIPLE_CHOICE,
      questionText: 'NestJS-д request validation хийхэд ямар package ашигладаг вэ?',
      explanation: 'class-validator болон class-transformer нь NestJS-д хамтран ашиглагддаг.',
      score: 2,
      sortOrder: 4,
      options: [
        { id: 'qo00002-0011', optionText: 'class-validator',   isCorrect: true,  sortOrder: 1 },
        { id: 'qo00002-0012', optionText: 'class-transformer', isCorrect: true,  sortOrder: 2 },
        { id: 'qo00002-0013', optionText: 'joi',               isCorrect: false, sortOrder: 3 },
        { id: 'qo00002-0014', optionText: 'yup',               isCorrect: false, sortOrder: 4 },
      ],
    },
    {
      id: 'qq00002-0000-0000-0000-000000000005',
      quizId: QUIZ_2,
      questionType: QuestionType.SINGLE_CHOICE,
      questionText: 'Guard нь NestJS-д ямар үүрэг гүйцэтгэдэг вэ?',
      explanation: 'Guard нь request-г controller-т хүрэхийн өмнө зөвшөөрөл шалгана.',
      score: 2,
      sortOrder: 5,
      options: [
        { id: 'qo00002-0015', optionText: 'Response форматлана',              isCorrect: false, sortOrder: 1 },
        { id: 'qo00002-0016', optionText: 'Зөвшөөрөл шалгана (Authorization)',isCorrect: true,  sortOrder: 2 },
        { id: 'qo00002-0017', optionText: 'Database холбоно',                 isCorrect: false, sortOrder: 3 },
        { id: 'qo00002-0018', optionText: 'Log хөтөлнө',                      isCorrect: false, sortOrder: 4 },
      ],
    },
  ];

  for (const q of q2Questions) {
    const { options, ...questionData } = q;
    await prisma.question.upsert({
      where: { id: q.id },
      update: {},
      create: questionData,
    });
    for (const opt of options) {
      await prisma.questionOption.upsert({
        where: { id: opt.id },
        update: {},
        create: { ...opt, questionId: q.id },
      });
    }
  }
  console.log('  ✓ Quiz 2 (NestJS) — 5 questions');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
