import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const features = {
  aiTutor: true,
  wallet: true,
  certificates: true,
  gamification: true,
  liveClasses: false,
};

const navigation = [
  {
    id: 'courses',
    label: 'Courses',
    labelMn: 'Хичээлүүд',
    href: '/courses',
    visible: true,
    order: 1,
  },
  { id: 'about', label: 'About', labelMn: 'Бидний тухай', href: '/about', visible: true, order: 2 },
  {
    id: 'teachers',
    label: 'Teachers',
    labelMn: 'Багш нар',
    href: '/teachers',
    visible: true,
    order: 3,
  },
  {
    id: 'contact',
    label: 'Contact',
    labelMn: 'Холбоо барих',
    href: '/contact',
    visible: true,
    order: 4,
  },
];

const homepageSections = [
  {
    id: 'hero',
    type: 'hero',
    enabled: true,
    order: 1,
    config: {
      title: 'Transform Your Future with World-Class Learning',
      titleMn: 'Дэлхийн Түвшний Сургалтаар Ирээдүйгээ Өөрчилье',
      ctaPrimary: { label: 'Start Learning Free', labelMn: 'Үнэгүй Эхлэх', href: '/register' },
      ctaSecondary: { label: 'Browse Courses', labelMn: 'Хичээлүүд Үзэх', href: '/courses' },
    },
  },
  {
    id: 'featured_courses',
    type: 'featured_courses',
    enabled: true,
    order: 2,
    config: { maxCount: 6 },
  },
];

const footer = {
  description: 'AI-native learning platform',
  descriptionMn: 'AI-д суурилсан сургалтын платформ',
  contactEmail: 'hello@know.mn',
  socialLinks: [],
  policyLinks: [],
};

async function main(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {
      name: 'Knowledge Academy',
      nameMn: 'Мэдлэгийн Академи',
      tagline: 'Transform Your Learning Journey',
      taglineMn: 'Суралцахуйгаа өөрчилье',
      locale: 'mn',
      defaultCurrency: 'MNT',
    },
    create: {
      slug: 'demo',
      name: 'Knowledge Academy',
      nameMn: 'Мэдлэгийн Академи',
      tagline: 'Transform Your Learning Journey',
      taglineMn: 'Суралцахуйгаа өөрчилье',
      locale: 'mn',
      defaultCurrency: 'MNT',
    },
  });

  await prisma.tenantDomain.upsert({
    where: { domain: 'demo.platform.mn' },
    update: { tenantId: tenant.id, isPrimary: true },
    create: {
      tenantId: tenant.id,
      domain: 'demo.platform.mn',
      isPrimary: true,
      verifiedAt: new Date(),
    },
  });

  await prisma.tenantBranding.upsert({
    where: { tenantId: tenant.id },
    update: {
      seoTitle: 'Knowledge Academy - Дэлхийн Түвшний Боловсрол',
      seoDescription: 'Шилдэг багш нараас мэдлэг ол. Өөрийн хурдаар, хаана ч суралц.',
      seoKeywords: 'LMS, online learning, Mongolia, курс, сургалт',
      features,
      navigation,
      homepageSections,
      footer,
    },
    create: {
      tenantId: tenant.id,
      seoTitle: 'Knowledge Academy - Дэлхийн Түвшний Боловсрол',
      seoDescription: 'Шилдэг багш нараас мэдлэг ол. Өөрийн хурдаар, хаана ч суралц.',
      seoKeywords: 'LMS, online learning, Mongolia, курс, сургалт',
      features,
      navigation,
      homepageSections,
      footer,
    },
  });

  console.log('Tenant seed complete: demo');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
