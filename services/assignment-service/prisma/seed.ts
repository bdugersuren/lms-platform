import { PrismaClient, AssignmentType } from '@prisma/client';

const prisma = new PrismaClient();

const C = {
  COURSE_1: 'c0000001-0000-0000-0000-000000000001',
  COURSE_2: 'c0000001-0000-0000-0000-000000000002',
  COURSE_3: 'c0000001-0000-0000-0000-000000000003',
};

async function main() {
  console.log('Seeding assignment-service...');

  const assignments = [
    {
      id: 'as000001-0000-0000-0000-000000000001',
      courseId: C.COURSE_1,
      lessonId: 'l1000001-0000-0000-0000-000000000006',
      title: 'TypeScript Todo App',
      description: 'TypeScript ашиглан энгийн Todo апп бүтээнэ үү.\n\n**Шаардлага:**\n- `interface Todo` тодорхойлно\n- `addTodo`, `removeTodo`, `completeTodo` функцуудыг бичнэ\n- Generic type ашиглана\n- TypeScript strict mode-д алдаагүй compile хийгдэх ёстой',
      type: AssignmentType.CODE,
      maxScore: 100,
      passingScore: 60,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      isPublished: true,
      allowLate: true,
    },
    {
      id: 'as000001-0000-0000-0000-000000000002',
      courseId: C.COURSE_1,
      lessonId: 'l1000001-0000-0000-0000-000000000004',
      title: 'Generic Stack бүтээх',
      description: 'Generic `Stack<T>` class бүтээж дараах методуудыг хэрэгжүүлнэ:\n- `push(item: T): void`\n- `pop(): T | undefined`\n- `peek(): T | undefined`\n- `isEmpty(): boolean`\n- `size(): number`',
      type: AssignmentType.CODE,
      maxScore: 100,
      passingScore: 70,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isPublished: true,
      allowLate: false,
    },
    {
      id: 'as000001-0000-0000-0000-000000000003',
      courseId: C.COURSE_2,
      lessonId: 'l2000001-0000-0000-0000-000000000006',
      title: 'NestJS REST API',
      description: 'NestJS + Prisma ашиглан ном (Book) удирдах REST API бүтээнэ үү.\n\n**Endpoint-ууд:**\n- `POST /books` — шинэ ном нэмэх\n- `GET /books` — жагсаалт (pagination дэмжих)\n- `GET /books/:id` — нэг ном\n- `PATCH /books/:id` — шинэчлэх\n- `DELETE /books/:id` — устгах\n\n**Нэмэлт:**\n- DTO validation\n- JWT Guard\n- Swagger баримтжуулал',
      type: AssignmentType.CODE,
      maxScore: 100,
      passingScore: 60,
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      isPublished: true,
      allowLate: true,
    },
    {
      id: 'as000001-0000-0000-0000-000000000004',
      courseId: C.COURSE_2,
      lessonId: 'l2000001-0000-0000-0000-000000000003',
      title: 'JWT Authentication тайлбар',
      description: 'JWT Authentication-ийн ажиллах зарчмыг тайлбарласан эссэ бичнэ үү.\n\n- Access token ба Refresh token-ийн зорилго\n- Token signature хэрхэн үүсдэг\n- Guard ба Strategy хэрхэн холбогддог\n- Security best practices\n\n**Хэмжээ:** 500-800 үг',
      type: AssignmentType.TEXT,
      maxScore: 100,
      passingScore: 60,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      isPublished: true,
      allowLate: false,
    },
    {
      id: 'as000001-0000-0000-0000-000000000005',
      courseId: C.COURSE_3,
      lessonId: 'l3000001-0000-0000-0000-000000000003',
      title: 'Dockerfile бичих',
      description: 'Node.js апп-д зориулсан multi-stage Dockerfile бичнэ үү.\n\n**Шаардлага:**\n- Builder stage: deps суулгах, TypeScript compile\n- Runner stage: зөвхөн production deps\n- Non-root user ашиглах\n- HEALTHCHECK нэмэх\n- Image-ийн хэмжээ 200MB-аас бага байх',
      type: AssignmentType.FILE_UPLOAD,
      maxScore: 100,
      passingScore: 70,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      isPublished: true,
      allowLate: false,
    },
    {
      id: 'as000001-0000-0000-0000-000000000006',
      courseId: C.COURSE_3,
      lessonId: 'l3000001-0000-0000-0000-000000000004',
      title: 'LMS Platform Docker Compose тайлбар',
      description: 'Энэхүү LMS платформын docker-compose.yml файлыг судалж тайлбарласан тайлан бичнэ үү.\n\n- Сервисүүдийн зорилго\n- Network тохиргоо\n- Healthcheck ажиллах зарчим\n- Volume хэрэглэх шалтгаан\n- depends_on ordering',
      type: AssignmentType.TEXT,
      maxScore: 100,
      passingScore: 60,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isPublished: true,
      allowLate: true,
    },
  ];

  for (const a of assignments) {
    await prisma.assignment.upsert({
      where: { id: a.id },
      update: {},
      create: a,
    });
  }
  console.log(`  ✓ ${assignments.length} assignments (2 per course)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
