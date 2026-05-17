'use client';

import { useTenant } from '@/lib/tenant-context';
import { HeroSection } from './hero-section';
import { StatsSection } from './stats-section';
import { FeaturedCoursesSection } from './featured-courses-section';
import { TestimonialsSection } from './testimonials-section';
import { TeacherShowcaseSection } from './teacher-showcase-section';
import { AnnouncementsSection } from './announcements-section';
import { FaqSection } from './faq-section';
import { PartnersSection } from './partners-section';
import type { HomepageSectionType } from '@/types/tenant';
import type {
  HeroConfig,
  StatisticsConfig,
  FeaturedCoursesConfig,
  TestimonialsConfig,
  TeacherShowcaseConfig,
  AnnouncementsConfig,
  FaqConfig,
  PartnersConfig,
} from '@/types/cms';

function renderSection(type: HomepageSectionType, config: Record<string, unknown>) {
  switch (type) {
    case 'hero':
      return <HeroSection config={config as unknown as HeroConfig} />;
    case 'statistics':
      return <StatsSection config={config as unknown as StatisticsConfig} />;
    case 'featured_courses':
      return <FeaturedCoursesSection config={config as unknown as FeaturedCoursesConfig} />;
    case 'testimonials':
      return <TestimonialsSection config={config as unknown as TestimonialsConfig} />;
    case 'teacher_showcase':
      return <TeacherShowcaseSection config={config as unknown as TeacherShowcaseConfig} />;
    case 'announcements':
      return <AnnouncementsSection config={config as unknown as AnnouncementsConfig} />;
    case 'faq':
      return <FaqSection config={config as unknown as FaqConfig} />;
    case 'partners':
      return <PartnersSection config={config as unknown as PartnersConfig} />;
    default:
      return null;
  }
}

export function HomepageBuilder() {
  const tenant = useTenant();

  const sections = [...tenant.homepageSections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      {sections.map((section) => (
        <div key={section.id}>{renderSection(section.type, section.config)}</div>
      ))}
    </>
  );
}
