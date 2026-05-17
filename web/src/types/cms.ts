export type HeroStat = {
  label: string;
  labelMn?: string;
  value: string;
};

export type HeroCtaButton = {
  label: string;
  labelMn?: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline';
};

export type HeroConfig = {
  title: string;
  titleMn?: string;
  subtitle?: string;
  subtitleMn?: string;
  backgroundImage?: string;
  backgroundGradient?: boolean;
  ctaPrimary?: HeroCtaButton;
  ctaSecondary?: HeroCtaButton;
  stats?: HeroStat[];
};

export type StatItem = {
  label: string;
  labelMn?: string;
  value: string;
  icon?: 'users' | 'book' | 'award' | 'certificate' | 'star' | 'chart';
};

export type StatisticsConfig = {
  items: StatItem[];
};

export type Testimonial = {
  id: string;
  name: string;
  role?: string;
  roleMn?: string;
  avatar?: string;
  content: string;
  contentMn?: string;
  rating?: number;
};

export type TestimonialsConfig = {
  title?: string;
  titleMn?: string;
  items: Testimonial[];
};

export type Teacher = {
  id: string;
  name: string;
  role?: string;
  roleMn?: string;
  avatar?: string;
  bio?: string;
  bioMn?: string;
  courseCount?: number;
  rating?: number;
};

export type TeacherShowcaseConfig = {
  title?: string;
  titleMn?: string;
  items: Teacher[];
};

export type AnnouncementType = 'info' | 'warning' | 'success' | 'event';

export type Announcement = {
  id: string;
  title: string;
  titleMn?: string;
  content: string;
  contentMn?: string;
  type: AnnouncementType;
  publishedAt: string;
  expiresAt?: string;
};

export type AnnouncementsConfig = {
  title?: string;
  titleMn?: string;
  items: Announcement[];
};

export type FaqItem = {
  id: string;
  question: string;
  questionMn?: string;
  answer: string;
  answerMn?: string;
};

export type FaqConfig = {
  title?: string;
  titleMn?: string;
  items: FaqItem[];
};

export type Partner = {
  id: string;
  name: string;
  logo?: string;
  url?: string;
};

export type PartnersConfig = {
  title?: string;
  titleMn?: string;
  items: Partner[];
};

export type FeaturedCoursesConfig = {
  title?: string;
  titleMn?: string;
  courseIds?: string[];
  maxCount?: number;
};
