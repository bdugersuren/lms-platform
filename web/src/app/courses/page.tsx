'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useCourses } from '@/hooks/use-courses';
import { useMyEnrollments } from '@/hooks/use-enrollment';
import { useAuthStore } from '@/store/auth.store';
import type { CourseLevel, CourseStatus } from '@/types/course';
import { clsx } from 'clsx';

const LEVELS: { value: CourseLevel | ''; label: string }[] = [
  { value: '', label: 'Бүх түвшин' },
  { value: 'BEGINNER', label: 'Эхлэгч' },
  { value: 'INTERMEDIATE', label: 'Дунд' },
  { value: 'ADVANCED', label: 'Дэвшилтэт' },
];

const STATUSES: { value: CourseStatus | ''; label: string }[] = [
  { value: '', label: 'Бүх төлөв' },
  { value: 'PUBLISHED', label: 'Нийтлэгдсэн' },
  { value: 'DRAFT', label: 'Ноорог' },
  { value: 'ARCHIVED', label: 'Архивлагдсан' },
];

const SORTS = [
  { value: 'newest', label: 'Шинэ эхэнд' },
  { value: 'oldest', label: 'Хуучин эхэнд' },
  { value: 'price_asc', label: 'Үнэ өсөх' },
  { value: 'price_desc', label: 'Үнэ буурах' },
];

const PRICE_FILTERS = [
  { value: 'all', label: 'Бүгд' },
  { value: 'free', label: 'Үнэгүй' },
  { value: 'paid', label: 'Төлбөртэй' },
];

const LANGUAGE_LABELS: Record<string, string> = {
  mn: 'Монгол 🇲🇳',
  en: 'English 🇬🇧',
  zh: 'Хятад 🇨🇳',
  ru: 'Орос 🇷🇺',
  ja: 'Япон 🇯🇵',
  ko: 'Солонгос 🇰🇷',
};

const levelLabels: Record<CourseLevel, string> = {
  BEGINNER: 'Эхлэгч',
  INTERMEDIATE: 'Дунд',
  ADVANCED: 'Дэвшилтэт',
};

const statusLabels: Record<CourseStatus, string> = {
  PUBLISHED: 'Нийтлэгдсэн',
  DRAFT: 'Ноорог',
  ARCHIVED: 'Архивлагдсан',
};

const levelColors: Record<CourseLevel, string> = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED: 'bg-red-100 text-red-700',
};

const statusColors: Record<CourseStatus, string> = {
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  ARCHIVED: 'bg-orange-100 text-orange-700',
};

export default function CoursesPage() {
  const { isAuthenticated, user } = useAuthStore();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [level, setLevel] = useState<CourseLevel | ''>('');
  const [status, setStatus] = useState<CourseStatus | ''>('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [langFilter, setLangFilter] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isInstructor = user?.role === 'INSTRUCTOR' || isAdmin;
  const canCreate = isInstructor;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useCourses({
    page,
    limit: 12,
    level: level || undefined,
    status: status || undefined,
    search: debouncedSearch || undefined,
  });

  const { data: enrollments } = useMyEnrollments();
  const enrolledCourseIds = useMemo(
    () => new Set((enrollments ?? []).map((e) => e.courseId)),
    [enrollments],
  );

  const rawCourses = data?.data?.items ?? [];
  const meta = data?.data?.meta;

  const allLanguages = useMemo(
    () => Array.from(new Set(rawCourses.map((c) => c.language).filter(Boolean))).sort(),
    [rawCourses],
  );

  const allTags = useMemo(() => {
    const freq = new Map<string, number>();
    rawCourses.forEach((c) => c.tags?.forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1)));
    return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  }, [rawCourses]);

  const hasActiveFilters = priceFilter !== 'all' || langFilter !== '' || selectedTags.size > 0;

  const courses = useMemo(() => {
    let filtered = rawCourses;

    if (priceFilter === 'free') filtered = filtered.filter((c) => Number(c.price) === 0);
    else if (priceFilter === 'paid') filtered = filtered.filter((c) => Number(c.price) > 0);

    if (langFilter) filtered = filtered.filter((c) => c.language === langFilter);

    if (selectedTags.size > 0) {
      filtered = filtered.filter((c) => c.tags?.some((t) => selectedTags.has(t)));
    }

    const sorted = [...filtered];
    if (sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
    } else if (sortBy === 'price_asc') {
      sorted.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => Number(b.price) - Number(a.price));
    }
    return sorted;
  }, [rawCourses, priceFilter, langFilter, selectedTags, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800">
              <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">LMS</span>
              </div>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-slate-500 hover:text-slate-800">Хяналтын самбар</Link>
              <span className="font-semibold text-slate-800">Сургалтууд</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {canCreate && (
              <Link
                href="/courses/new"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                + Шинэ сургалт
              </Link>
            )}
            {isAuthenticated && (
              <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
                {user?.email}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Сургалт хайх..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={level}
            onChange={(e) => { setLevel(e.target.value as CourseLevel | ''); setPage(1); }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          {(isAdmin || isInstructor) && (
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as CourseStatus | ''); setPage(1); }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          )}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Filter pills */}
        <div className="space-y-2 mb-6">
          {/* Price filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500 w-14 shrink-0">Үнэ:</span>
            {PRICE_FILTERS.map((pf) => (
              <button
                key={pf.value}
                onClick={() => setPriceFilter(pf.value as 'all' | 'free' | 'paid')}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  priceFilter === pf.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300',
                )}
              >
                {pf.label}
              </button>
            ))}
          </div>

          {/* Language filter */}
          {allLanguages.length > 1 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-500 w-14 shrink-0">Хэл:</span>
              <button
                onClick={() => setLangFilter('')}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  langFilter === ''
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300',
                )}
              >
                Бүгд
              </button>
              {allLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLangFilter(lang === langFilter ? '' : lang)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    langFilter === lang
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300',
                  )}
                >
                  {LANGUAGE_LABELS[lang] ?? lang}
                </button>
              ))}
            </div>
          )}

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-500 w-14 shrink-0">Таг:</span>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTags((prev) => {
                      const next = new Set(prev);
                      if (next.has(tag)) next.delete(tag);
                      else next.add(tag);
                      return next;
                    });
                  }}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    selectedTags.has(tag)
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300',
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Clear all filters */}
          {hasActiveFilters && (
            <div className="flex">
              <button
                onClick={() => {
                  setPriceFilter('all');
                  setLangFilter('');
                  setSelectedTags(new Set());
                }}
                className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2 transition-colors"
              >
                Шүүлтүүр цэвэрлэх ✕
              </button>
            </div>
          )}
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-slate-800">
            {meta ? `${courses.length} сургалт` : 'Сургалтууд'}
          </h1>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
                <div className="h-40 bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-16">
            <p className="text-red-500 text-sm">{error.message}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && courses.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-lg font-medium text-slate-700 mb-2">Сургалт олдсонгүй</h2>
            <p className="text-slate-400 text-sm mb-6">Хайлт эсвэл шүүлтүүрийг өөрчилж үзнэ үү</p>
            {canCreate && (
              <Link
                href="/courses/new"
                className="inline-flex px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Анхны сургалт үүсгэх
              </Link>
            )}
          </div>
        )}

        {/* Course grid */}
        {!isLoading && courses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all duration-200"
              >
                {/* Thumbnail */}
                <div className="relative h-40 bg-gradient-to-br from-indigo-100 to-slate-100 flex items-center justify-center overflow-hidden">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">📖</span>
                  )}
                  <span className={clsx('absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium', statusColors[course.status])}>
                    {statusLabels[course.status] ?? course.status}
                  </span>
                  {enrolledCourseIds.has(course.id) ? (
                    <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-600 text-white">
                      Бүртгүүлсэн ✓
                    </span>
                  ) : Number(course.price) === 0 ? (
                    <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium bg-green-600 text-white">
                      Үнэгүй
                    </span>
                  ) : null}
                </div>

                {/* Body */}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors mb-2">
                    {course.title}
                  </h3>

                  {course.description && (
                    <p className="text-slate-400 text-xs line-clamp-2 mb-3">{course.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', levelColors[course.level])}>
                      {levelLabels[course.level] ?? course.level}
                    </span>
                    <span className="text-xs text-slate-500">
                      {course.totalLessons} хичээл
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      {Number(course.price) === 0 ? 'Үнэгүй' : `₮${Number(course.price).toLocaleString('mn-MN')}`}
                    </span>
                    {course.totalMinutes > 0 && (
                      <span className="text-xs text-slate-400">{course.totalMinutes} мин</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!meta.hasPreviousPage}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              ← Өмнөх
            </button>
            <span className="px-4 py-2 text-sm text-slate-600">
              {meta.page} / {meta.totalPages} хуудас
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNextPage}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Дараах →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
