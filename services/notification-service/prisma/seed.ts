import { PrismaClient, NotificationType, NotificationChannel, NotificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

const U = {
  SUPER_ADMIN:  'a0000001-0000-0000-0000-000000000001',
  ADMIN_1:      'a0000001-0000-0000-0000-000000000002',
  INSTRUCTOR_1: 'a0000001-0000-0000-0000-000000000003',
  INSTRUCTOR_2: 'a0000001-0000-0000-0000-000000000004',
  STUDENT_1:    'a0000001-0000-0000-0000-000000000005',
  STUDENT_2:    'a0000001-0000-0000-0000-000000000006',
  STUDENT_3:    'a0000001-0000-0000-0000-000000000007',
};

async function main() {
  console.log('Seeding notification-service...');

  // ── Notification Preferences (бүх хэрэглэгчид) ───────────────────────────
  const prefs = [
    { userId: U.SUPER_ADMIN,  inApp: true, email: true,  sms: false, push: false, marketing: false },
    { userId: U.ADMIN_1,      inApp: true, email: true,  sms: false, push: false, marketing: false },
    { userId: U.INSTRUCTOR_1, inApp: true, email: true,  sms: false, push: true,  marketing: false },
    { userId: U.INSTRUCTOR_2, inApp: true, email: true,  sms: false, push: true,  marketing: false },
    { userId: U.STUDENT_1,    inApp: true, email: true,  sms: false, push: true,  marketing: true  },
    { userId: U.STUDENT_2,    inApp: true, email: false, sms: false, push: true,  marketing: false },
    { userId: U.STUDENT_3,    inApp: true, email: true,  sms: false, push: false, marketing: false },
  ];

  for (const pref of prefs) {
    await prisma.notificationPreference.upsert({
      where:  { userId: pref.userId },
      update: {},
      create: {
        id: `np-${pref.userId.slice(-8)}`,
        ...pref,
        assignmentGraded: true,
        courseEnrolled: true,
        quizResult: true,
        paymentConfirmed: true,
      },
    });
  }
  console.log(`  ✓ ${prefs.length} notification preferences`);

  // ── Sample Notifications ──────────────────────────────────────────────────
  const notifications = [
    {
      id: 'notif001-0000-0000-0000-000000000001',
      userId: U.STUDENT_1,
      type: NotificationType.COURSE_ENROLLED,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      title: 'TypeScript Fundamentals сургалтад бүртгэгдлээ',
      body: 'Та TypeScript Fundamentals сургалтад амжилттай бүртгэгдлээ. Сурахаа эхлэцгээе!',
      isRead: true,
      readAt: new Date('2026-03-01T11:00:00Z'),
    },
    {
      id: 'notif001-0000-0000-0000-000000000002',
      userId: U.STUDENT_1,
      type: NotificationType.PAYMENT_CONFIRMED,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      title: 'Төлбөр баталгаажлаа',
      body: 'TypeScript Fundamentals сургалтын 49,000₮ төлбөр амжилттай хийгдлээ.',
      isRead: true,
      readAt: new Date('2026-03-01T10:35:00Z'),
    },
    {
      id: 'notif001-0000-0000-0000-000000000003',
      userId: U.STUDENT_1,
      type: NotificationType.COURSE_ENROLLED,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      title: 'NestJS Backend Development сургалтад бүртгэгдлээ',
      body: 'NestJS Backend Development сургалт нэмэгдлээ. Шинэ аялал эхэллээ!',
      isRead: false,
    },
    {
      id: 'notif001-0000-0000-0000-000000000004',
      userId: U.STUDENT_1,
      type: NotificationType.SUCCESS,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      title: 'TypeScript сургалт дууслаа!',
      body: 'TypeScript Fundamentals сургалтыг 92 оноотойгоор амжилттай дуусгалаа. Гэрчилгээ гаргах боломжтой.',
      isRead: false,
    },
    {
      id: 'notif001-0000-0000-0000-000000000005',
      userId: U.STUDENT_2,
      type: NotificationType.COURSE_ENROLLED,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      title: 'TypeScript Fundamentals сургалтад бүртгэгдлээ',
      body: 'Та TypeScript Fundamentals сургалтад амжилттай бүртгэгдлээ.',
      isRead: false,
    },
    {
      id: 'notif001-0000-0000-0000-000000000006',
      userId: U.STUDENT_3,
      type: NotificationType.PAYMENT_CONFIRMED,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      title: 'Төлбөр хүлээгдэж байна',
      body: 'Docker & DevOps сургалтын QPay QR код үүслээ. 30 минутын дотор төлнө үү.',
      isRead: false,
    },
    {
      id: 'notif001-0000-0000-0000-000000000007',
      userId: U.INSTRUCTOR_1,
      type: NotificationType.INFO,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      title: 'Шинэ оюутан бүртгэгдлээ',
      body: 'TypeScript Fundamentals сургалтанд шинэ оюутан бүртгэгдлээ. Нийт 2 оюутан.',
      isRead: true,
      readAt: new Date('2026-05-02T08:00:00Z'),
    },
    {
      id: 'notif001-0000-0000-0000-000000000008',
      userId: U.INSTRUCTOR_1,
      type: NotificationType.SUCCESS,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      title: 'Орлого нэмэгдлээ',
      body: 'Энэ сард нийт 128,200₮ орлого байна. Дэлгэрэнгүйг Wallet хуудаснаас харна уу.',
      isRead: false,
    },
  ];

  for (const n of notifications) {
    await prisma.notification.upsert({
      where:  { id: n.id },
      update: {},
      create: n,
    });
  }
  console.log(`  ✓ ${notifications.length} notifications`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
