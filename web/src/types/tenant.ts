export type ButtonStyle = 'rounded' | 'pill' | 'square';
export type CardStyle = 'shadow' | 'border' | 'flat';
export type TenantLocale = 'mn' | 'en' | 'both';
export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'youtube'
  | 'linkedin'
  | 'tiktok';

export type TenantFeatures = {
  aiTutor: boolean;
  wallet: boolean;
  certificates: boolean;
  gamification: boolean;
  liveClasses: boolean;
};

export type TenantBranding = {
  logo?: string;
  logoDark?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily?: string;
  darkModeEnabled: boolean;
  buttonStyle: ButtonStyle;
  cardStyle: CardStyle;
};

export type NavItem = {
  id: string;
  label: string;
  labelMn?: string;
  href: string;
  visible: boolean;
  order: number;
  icon?: string;
  children?: NavItem[];
};

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
};

export type FooterConfig = {
  description?: string;
  descriptionMn?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  addressMn?: string;
  socialLinks?: SocialLink[];
  policyLinks?: { label: string; labelMn?: string; href: string }[];
  branches?: { name: string; nameMn?: string; address: string }[];
  copyright?: string;
};

export type HomepageSectionType =
  | 'hero'
  | 'featured_courses'
  | 'statistics'
  | 'testimonials'
  | 'teacher_showcase'
  | 'announcements'
  | 'pricing'
  | 'partners'
  | 'faq'
  | 'how_it_works';

export type HomepageSection = {
  id: string;
  type: HomepageSectionType;
  enabled: boolean;
  order: number;
  config: Record<string, unknown>;
};

export type TenantSeo = {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
};

export type TenantConfig = {
  id: string;
  slug: string;
  name: string;
  nameMn?: string;
  tagline?: string;
  taglineMn?: string;
  domain?: string;
  subdomain?: string;
  branding: TenantBranding;
  seo: TenantSeo;
  features: TenantFeatures;
  navigation: NavItem[];
  homepageSections: HomepageSection[];
  footer: FooterConfig;
  locale: TenantLocale;
  defaultCurrency?: string;
  platformFeePercent?: string;
};
