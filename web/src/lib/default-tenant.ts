import type { TenantConfig } from '@/types/tenant';

export const DEFAULT_TENANT: TenantConfig = {
  id: 'demo',
  slug: 'demo',
  name: 'Knowledge Academy',
  nameMn: 'Мэдлэгийн Академи',
  tagline: 'Transform Your Learning Journey',
  taglineMn: 'Суралцахуйгаа өөрчилье',
  branding: {
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#06b6d4',
    darkModeEnabled: false,
    buttonStyle: 'rounded',
    cardStyle: 'shadow',
  },
  seo: {
    title: 'Knowledge Academy - Дэлхийн Түвшний Боловсрол',
    description: 'Шилдэг багш нараас мэдлэг ол. Өөрийн хурдаар, хаана ч суралц.',
    keywords: 'LMS, online learning, Mongolia, курс, сургалт',
  },
  features: {
    aiTutor: true,
    wallet: true,
    certificates: true,
    gamification: true,
    liveClasses: false,
  },
  navigation: [
    { id: '1', label: 'Courses', labelMn: 'Хичээлүүд', href: '/courses', visible: true, order: 1 },
    { id: '2', label: 'About', labelMn: 'Бидний тухай', href: '/about', visible: true, order: 2 },
    { id: '3', label: 'Teachers', labelMn: 'Багш нар', href: '/teachers', visible: true, order: 3 },
    { id: '4', label: 'Contact', labelMn: 'Холбоо барих', href: '/contact', visible: true, order: 4 },
  ],
  homepageSections: [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      order: 1,
      config: {
        title: 'Transform Your Future with World-Class Learning',
        titleMn: 'Дэлхийн Түвшний Сургалтаар Ирээдүүлээ Өөрчилье',
        subtitle:
          'Access expert-led courses, earn recognized certificates, and advance your career with our AI-powered learning platform.',
        subtitleMn:
          'Шилдэг багш нараас суралцаж, хүлээн зөвшөөрөгдсөн гэрчилгээ ав. AI хөгжүүлсэн сургалтын платформоор карьераа дэвшүүл.',
        backgroundGradient: true,
        ctaPrimary: { label: 'Start Learning Free', labelMn: 'Үнэгүй Эхлэх', href: '/register' },
        ctaSecondary: { label: 'Browse Courses', labelMn: 'Хичээлүүд Үзэх', href: '/courses' },
        stats: [
          { label: 'Students', labelMn: 'Сурагч', value: '10,000+' },
          { label: 'Courses', labelMn: 'Хичээл', value: '500+' },
          { label: 'Instructors', labelMn: 'Багш', value: '200+' },
          { label: 'Completion Rate', labelMn: 'Дуусгалт', value: '94%' },
        ],
      },
    },
    {
      id: 'stats',
      type: 'statistics',
      enabled: true,
      order: 2,
      config: {
        items: [
          { label: 'Active Students', labelMn: 'Идэвхтэй Сурагч', value: '10,000+', icon: 'users' },
          { label: 'Expert Courses', labelMn: 'Мэргэжлийн Хичээл', value: '500+', icon: 'book' },
          { label: 'Certified Instructors', labelMn: 'Гэрчилгээт Багш', value: '200+', icon: 'award' },
          { label: 'Certificates Issued', labelMn: 'Олгосон Гэрчилгээ', value: '8,500+', icon: 'certificate' },
        ],
      },
    },
    {
      id: 'featured_courses',
      type: 'featured_courses',
      enabled: true,
      order: 3,
      config: {
        title: 'Featured Courses',
        titleMn: 'Онцлох Хичээлүүд',
        maxCount: 6,
      },
    },
    {
      id: 'testimonials',
      type: 'testimonials',
      enabled: true,
      order: 4,
      config: {
        title: 'Student Success Stories',
        titleMn: 'Сурагчдын Амжилтын Түүхүүд',
        items: [
          {
            id: '1',
            name: 'Болд Батаа',
            role: 'Software Engineer at StartupMN',
            roleMn: 'StartupMN-ийн Программист',
            content:
              'This platform completely transformed my career. In just 6 months I went from a complete beginner to landing my first developer job.',
            contentMn:
              'Энэ платформ миний карьерыг бүрмөсөн өөрчилсөн. Ердөө 6 сарын дотор анхны программистын ажилдаа орлоо.',
            rating: 5,
          },
          {
            id: '2',
            name: 'Нарантуяа Д.',
            role: 'UX Designer',
            roleMn: 'UX Дизайнер',
            content:
              'The instructors are incredibly knowledgeable. The community support and the structured curriculum made learning feel natural.',
            contentMn:
              'Багш нар маш мэдлэгтэй. Нийгэмлэгийн дэмжлэг болон бүтэцтэй хөтөлбөр нь суралцахыг байгалийн мэт болгосон.',
            rating: 5,
          },
          {
            id: '3',
            name: 'Ганзориг М.',
            role: 'Data Scientist',
            roleMn: 'Өгөгдлийн Шинжээч',
            content:
              'The AI tutor feature is revolutionary. It adapts to my learning pace and gives personalized feedback on every assignment.',
            contentMn:
              'AI багшийн функц нь хувьсгалт юм. Миний суралцах хурдад нийцэж, хичээл бүрд хувийн санал хүсэлт өгдөг.',
            rating: 5,
          },
        ],
      },
    },
    {
      id: 'teachers',
      type: 'teacher_showcase',
      enabled: true,
      order: 5,
      config: {
        title: 'Meet Our Expert Instructors',
        titleMn: 'Манай Шилдэг Багш Нар',
        items: [
          {
            id: '1',
            name: 'Б. Хасбаатар',
            role: 'Full Stack Developer',
            roleMn: 'Full Stack Хөгжүүлэгч',
            bio: '10+ years of industry experience in web and mobile development.',
            bioMn: 'Веб болон мобайл хөгжүүлэлтийн 10+ жилийн туршлагатай.',
            courseCount: 12,
            rating: 4.9,
          },
          {
            id: '2',
            name: 'О. Уранчимэг',
            role: 'Data Science Lead',
            roleMn: 'Өгөгдлийн Шинжлэх Ухааны Ахлагч',
            bio: 'Former ML engineer at international tech companies.',
            bioMn: 'Олон улсын технологийн компаниудад ML инженерээр ажилласан.',
            courseCount: 8,
            rating: 4.8,
          },
          {
            id: '3',
            name: 'Г. Мөнхбаяр',
            role: 'UI/UX Design Expert',
            roleMn: 'UI/UX Дизайны Мэргэжилтэн',
            bio: 'Award-winning designer with clients across Asia and Europe.',
            bioMn: 'Ази болон Европт харилцагчидтай шагналт дизайнер.',
            courseCount: 6,
            rating: 4.9,
          },
          {
            id: '4',
            name: 'Д. Батжаргал',
            role: 'Business & Leadership',
            roleMn: 'Бизнес ба Удирдлага',
            bio: 'MBA holder, founder of 3 successful businesses in Mongolia.',
            bioMn: 'MBA зэрэгтэй, Монголд 3 амжилттай бизнесийн үүсгэн байгуулагч.',
            courseCount: 10,
            rating: 4.7,
          },
        ],
      },
    },
    {
      id: 'faq',
      type: 'faq',
      enabled: true,
      order: 6,
      config: {
        title: 'Frequently Asked Questions',
        titleMn: 'Түгээмэл Асуултууд',
        items: [
          {
            id: '1',
            question: 'How do I get started?',
            questionMn: 'Хэрхэн эхлэх вэ?',
            answer:
              'Simply create a free account, browse our course catalog, and enroll in any course that interests you. You can start learning immediately after registration.',
            answerMn:
              'Үнэгүй бүртгэл үүсгэж, хичээлийн каталогоос хайж, сонирхсон хичээлдээ бүртгүүлэхэд л хангалттай. Бүртгүүлсний дараа шууд суралцаж эхлэх боломжтой.',
          },
          {
            id: '2',
            question: 'Are the certificates industry-recognized?',
            questionMn: 'Гэрчилгээ нь салбарт хүлээн зөвшөөрөгддөг үү?',
            answer:
              'Yes, our certificates are industry-recognized and come with QR code verification. Many employers in Mongolia and internationally accept our credentials.',
            answerMn:
              'Тийм, манай гэрчилгээнүүд салбарт хүлээн зөвшөөрөгдсөн бөгөөд QR кодоор баталгаажуулах боломжтой. Монгол болон олон улсын олон компани манай гэрчилгээг хүлээн зөвшөөрдөг.',
          },
          {
            id: '3',
            question: 'Can I learn at my own pace?',
            questionMn: 'Өөрийн хурдаар суралцаж болох уу?',
            answer:
              'Absolutely! All courses are self-paced. You can start, pause, and resume learning whenever you want. Your progress is saved automatically.',
            answerMn:
              'Мэдээж! Бүх хичээлүүд өөрийн хурдаар явагдана. Хэзээ ч эхлэх, зогсоох, үргэлжлүүлэх боломжтой. Таны явц автоматаар хадгалагдана.',
          },
          {
            id: '4',
            question: 'Is there a mobile app?',
            questionMn: 'Мобайл апп байдаг уу?',
            answer:
              'Yes! We have a Flutter-based mobile app available for both iOS and Android, so you can learn on the go even without internet connection.',
            answerMn:
              'Тийм! iOS болон Android-д зориулсан Flutter апп байдаг тул интернетгүй байсан ч замд суралцах боломжтой.',
          },
          {
            id: '5',
            question: 'What payment methods are accepted?',
            questionMn: 'Ямар төлбөрийн арга хэрэглэж болох вэ?',
            answer:
              'We accept QPay, SocialPay, bank transfers, and major credit cards. You can also use your wallet balance earned through referrals.',
            answerMn:
              'QPay, SocialPay, банкны шилжүүлэг болон гол кредит картуудыг хүлээн авдаг. Мөн найз нөхдөө урьснаар цуглуулсан хэтэвчний үлдэгдлээ ашиглаж болно.',
          },
        ],
      },
    },
  ],
  footer: {
    description: 'Empowering learners with world-class education. Build skills that matter.',
    descriptionMn: 'Суралцагчдыг дэлхийн түвшний боловсролоор хангаж байна. Чухал ур чадвар эзэмш.',
    contactEmail: 'info@knowledge.mn',
    contactPhone: '+976 9911-9911',
    address: 'Ulaanbaatar, Mongolia',
    addressMn: 'Улаанбаатар хот, Монгол Улс',
    socialLinks: [
      { platform: 'facebook', url: 'https://facebook.com' },
      { platform: 'instagram', url: 'https://instagram.com' },
      { platform: 'youtube', url: 'https://youtube.com' },
    ],
    policyLinks: [
      { label: 'Privacy Policy', labelMn: 'Нууцлалын бодлого', href: '/privacy' },
      { label: 'Terms of Service', labelMn: 'Үйлчилгээний нөхцөл', href: '/terms' },
    ],
    copyright: '© 2026 Knowledge Academy. Бүх эрх хуулиар хамгаалагдсан.',
  },
  locale: 'both',
};
