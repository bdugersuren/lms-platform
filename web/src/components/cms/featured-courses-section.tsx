'use client';

import Link from 'next/link';
import { useLocale } from '@/hooks/use-locale';
import { useCourses } from '@/hooks/use-courses';
import type { FeaturedCoursesConfig } from '@/types/cms';
import type { Course, CourseLevel } from '@/types/course';
import clsx from 'clsx';

const levelColors: Record<CourseLevel, string> = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED: 'bg-red-100 text-red-700',
};

const levelLabels: Record<CourseLevel, { en: string; mn: string }> = {
  BEGINNER: { en: 'Beginner', mn: 'Анхан шат' },
  INTERMEDIATE: { en: 'Intermediate', mn: 'Дунд шат' },
  ADVANCED: { en: 'Advanced', mn: 'Дэвшилтэт' },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={clsx('w-3.5 h-3.5', i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300')}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function CourseCard({ course, locale }: { course: Course; locale: string }) {
  const level = course.level;
  const levelLabel = locale === 'mn' ? levelLabels[level].mn : levelLabels[level].en;
  const price = parseFloat(course.price);
  const isFree = price === 0;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, rgb(var(--color-primary) / 0.15), rgb(var(--color-secondary) / 0.15))`,
            }}
          >
            <svg
              className="w-12 h-12 opacity-30"
              style={{ color: `rgb(var(--color-primary))` }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
        )}
        <span className={clsx('absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full', levelColors[level])}>
          {levelLabel}
        </span>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{course.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-2">
            <StarRating rating={4.5} />
            <span className="text-xs text-gray-500">({course.totalLessons} {locale === 'mn' ? 'хичээл' : 'lessons'})</span>
          </div>
          <div
            className="font-bold text-sm"
            style={{ color: `rgb(var(--color-primary))` }}
          >
            {isFree ? (locale === 'mn' ? 'Үнэгүй' : 'Free') : `₮${price.toLocaleString()}`}
          </div>
        </div>
      </div>
    </Link>
  );
}

function CourseCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
      <div className="aspect-video bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="pt-3 border-t border-gray-100 flex justify-between">
          <div className="h-3 bg-gray-200 rounded w-20" />
          <div className="h-3 bg-gray-200 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

export function FeaturedCoursesSection({ config }: { config: FeaturedCoursesConfig }) {
  const { locale, t } = useLocale();
  const maxCount = config.maxCount ?? 6;

  const { data, isLoading } = useCourses({ status: 'PUBLISHED', limit: maxCount });
  const courses = data?.data.items ?? [];

  const title = t(config.title ?? 'Featured Courses', config.titleMn);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: `rgb(var(--color-primary))` }}>
              {t('Courses', 'Хичээлүүд')}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">{title}</h2>
          </div>
          <Link
            href="/courses"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: `rgb(var(--color-primary))` }}
          >
            {t('View all', 'Бүгдийг үзэх')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: maxCount }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-lg font-medium">{t('No courses yet', 'Одоохондоо хичээл байхгүй')}</p>
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: `rgb(var(--color-primary))` }}
          >
            {t('View all courses', 'Бүх хичээлийг үзэх')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
