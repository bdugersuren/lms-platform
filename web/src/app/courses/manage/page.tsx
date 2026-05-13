'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCourses,
  usePublishCourse,
  useArchiveCourse,
  useDeleteCourse,
} from '@/hooks/use-courses';
import { useAuthStore } from '@/store/auth.store';
import { useMe } from '@/hooks/use-auth';
import type { Course, CourseStatus } from '@/types/course';
import { clsx } from 'clsx';

const STATUS_TABS: { value: CourseStatus | ''; label: string; dot: string }[] = [
  { value: '', label: 'Бүгд', dot: 'bg-slate-400' },
  { value: 'DRAFT', label: 'Ноорог', dot: 'bg-yellow-400' },
  { value: 'PUBLISHED', label: 'Нийтлэгдсэн', dot: 'bg-emerald-500' },
  { value: 'ARCHIVED', label: 'Архивласан', dot: 'bg-orange-400' },
];

const levelLabel: Record<string, string> = {
  BEGINNER: 'Анхан',
  INTERMEDIATE: 'Дунд',
  ADVANCED: 'Дээд',
};

const statusConfig: Record<CourseStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Ноорог', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  PUBLISHED: { label: 'Нийтлэгдсэн', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ARCHIVED: { label: 'Архив', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
};

function ConfirmDialog({
  open, title, description, confirmLabel, danger, onConfirm, onCancel,
}: {
  open: boolean; title: string; description: string; confirmLabel: string;
  danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Цуцлах
          </button>
          <button
            onClick={onConfirm}
            className={clsx(
              'px-4 py-2 text-sm rounded-lg font-medium transition-colors',
              danger ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-indigo-600 text-white hover:bg-indigo-700',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CourseManagePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Fetch fresh user profile — this ensures role data is available
  const { data: user, isLoading: userLoading } = useMe();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isInstructor = user?.role === 'INSTRUCTOR';
  const hasAccess = isAdmin || isInstructor;

  const [statusFilter, setStatusFilter] = useState<CourseStatus | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'publish' | 'archive' | 'delete';
    course: Course;
  } | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const queryParams = {
    page,
    limit: 15,
    status: statusFilter || undefined,
    instructorId: isInstructor && user?.id ? user.id : undefined,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading: coursesLoading, error } = useCourses(queryParams);
  const publish = usePublishCourse();
  const archive = useArchiveCourse();
  const deleteCourse = useDeleteCourse();

  const courses = data?.data?.items ?? [];
  const meta = data?.data?.meta;

  const setError = (id: string, msg: string) =>
    setActionErrors((prev) => ({ ...prev, [id]: msg }));

  const handleConfirm = () => {
    if (!confirmDialog) return;
    const { type, course } = confirmDialog;
    setConfirmDialog(null);
    if (type === 'publish') {
      publish.mutate(course.id, { onError: (e) => setError(course.id, e.message) });
    } else if (type === 'archive') {
      archive.mutate(course.id, { onError: (e) => setError(course.id, e.message) });
    } else if (type === 'delete') {
      deleteCourse.mutate(course.id, { onError: (e) => setError(course.id, e.message) });
    }
  };

  // While auth or user data is loading, show spinner
  if (!isAuthenticated) return null;

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // After user loads, check role
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-3">🔒</p>
          <p className="text-slate-600 mb-4">Энэ хуудсанд нэвтрэх эрх байхгүй байна.</p>
          <Link href="/courses" className="text-indigo-600 hover:underline text-sm">
            Курс каталог руу буцах
          </Link>
        </div>
      </div>
    );
  }

  const statusCounts = courses.reduce<Record<string, number>>(
    (acc, c) => { acc[c.status] = (acc[c.status] ?? 0) + 1; return acc; },
    {},
  );

  return (
    <>
      <ConfirmDialog
        open={!!confirmDialog}
        title={
          confirmDialog?.type === 'delete'
            ? `"${confirmDialog.course.title}" курсыг устгах уу?`
            : confirmDialog?.type === 'publish'
              ? `"${confirmDialog?.course.title}" курсыг нийтлэх үү?`
              : `"${confirmDialog?.course.title}" курсыг архивлах уу?`
        }
        description={
          confirmDialog?.type === 'delete'
            ? 'Устгасны дараа сэргээх боломжгүй. Бүх модуль, хичээлүүд устана.'
            : confirmDialog?.type === 'publish'
              ? 'Нийтэлсний дараа сурагчид харж болно.'
              : 'Архивласан курсыг шинэ сурагчид харахгүй.'
        }
        confirmLabel={
          confirmDialog?.type === 'delete' ? 'Устгах' :
          confirmDialog?.type === 'publish' ? 'Нийтлэх' : 'Архивлах'
        }
        danger={confirmDialog?.type === 'delete'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmDialog(null)}
      />

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-xs">LMS</span>
                </div>
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/dashboard" className="text-slate-400 hover:text-slate-700">Нүүр</Link>
                <Link href="/courses" className="text-slate-400 hover:text-slate-700">Каталог</Link>
                <span className="font-semibold text-slate-800">Курс удирдах</span>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400 hidden sm:block">{user?.email}</span>
              <Link
                href="/courses/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <span className="text-base leading-none">+</span>
                Шинэ курс
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page title */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Курс удирдах</h1>
            <p className="text-sm text-slate-500 mt-1">
              {isAdmin ? 'Бүх курсыг' : 'Таны'} удирдах, засах, нийтлэх боломж
            </p>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Нийт', value: meta?.total ?? 0, cls: 'text-slate-800' },
              { label: 'Нийтлэгдсэн', value: statusCounts['PUBLISHED'] ?? 0, cls: 'text-emerald-600' },
              { label: 'Ноорог', value: statusCounts['DRAFT'] ?? 0, cls: 'text-yellow-600' },
              { label: 'Архив', value: statusCounts['ARCHIVED'] ?? 0, cls: 'text-orange-500' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className={clsx('text-2xl font-bold', s.cls)}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 flex-wrap">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => { setStatusFilter(tab.value as CourseStatus | ''); setPage(1); }}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    statusFilter === tab.value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  <span className={clsx('w-1.5 h-1.5 rounded-full', tab.dot)} />
                  {tab.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Гарчгаар хайх..."
              className="flex-1 min-w-0 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {coursesLoading ? (
              <div className="py-20 flex justify-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="py-16 text-center text-red-500 text-sm">{error.message}</div>
            ) : courses.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-slate-500 text-sm mb-4">Курс олдсонгүй</p>
                <Link
                  href="/courses/new"
                  className="inline-flex px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Шинэ курс үүсгэх
                </Link>
              </div>
            ) : (
              <>
                <div className="hidden sm:grid grid-cols-[1fr_130px_90px_70px_190px] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <span>Курс</span>
                  <span>Статус</span>
                  <span>Түвшин</span>
                  <span>Хичээл</span>
                  <span className="text-right">Үйлдэл</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {courses.map((course) => (
                    <CourseRow
                      key={course.id}
                      course={course}
                      actionError={actionErrors[course.id]}
                      onPublish={() => setConfirmDialog({ type: 'publish', course })}
                      onArchive={() => setConfirmDialog({ type: 'archive', course })}
                      onDelete={() => setConfirmDialog({ type: 'delete', course })}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-sm text-slate-500">
                Нийт {meta.total} курс · {meta.page}/{meta.totalPages} хуудас
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!meta.hasPreviousPage}
                  className="px-4 py-2 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Өмнөх
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!meta.hasNextPage}
                  className="px-4 py-2 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Дараах
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function CourseRow({
  course, actionError, onPublish, onArchive, onDelete,
}: {
  course: Course;
  actionError?: string;
  onPublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const sc = statusConfig[course.status];
  return (
    <div className="px-5 py-4">
      <div className="sm:grid sm:grid-cols-[1fr_130px_90px_70px_190px] sm:gap-4 sm:items-center">
        {/* Title */}
        <div className="mb-3 sm:mb-0">
          <Link
            href={`/courses/${course.id}`}
            className="font-medium text-slate-800 hover:text-indigo-700 transition-colors line-clamp-1 text-sm"
          >
            {course.title}
          </Link>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {course.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
            <span className="text-xs text-slate-400">
              {Number(course.price) === 0 ? 'Үнэгүй' : `₮${Number(course.price).toLocaleString()}`}
            </span>
          </div>
          {actionError && <p className="text-xs text-red-500 mt-1">{actionError}</p>}
        </div>

        {/* Status */}
        <div className="hidden sm:block">
          <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', sc.cls)}>
            {sc.label}
          </span>
        </div>

        {/* Level */}
        <div className="hidden sm:block text-sm text-slate-500">
          {levelLabel[course.level] ?? course.level}
        </div>

        {/* Lessons */}
        <div className="hidden sm:block text-sm text-slate-500">{course.totalLessons}</div>

        {/* Actions */}
        <div className="flex items-center gap-2 justify-start sm:justify-end flex-wrap">
          <span className={clsx('sm:hidden inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', sc.cls)}>
            {sc.label}
          </span>
          {(course.status === 'DRAFT' || course.status === 'ARCHIVED') && (
            <button
              onClick={onPublish}
              className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              {course.status === 'ARCHIVED' ? 'Дахин нийтлэх' : 'Нийтлэх'}
            </button>
          )}
          {course.status === 'PUBLISHED' && (
            <button
              onClick={onArchive}
              className="px-3 py-1.5 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              Архивлах
            </button>
          )}
          <Link
            href={`/courses/${course.id}/manage`}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Контент
          </Link>
          <Link
            href={`/courses/${course.id}/edit`}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            Засах
          </Link>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            Устгах
          </button>
        </div>
      </div>
    </div>
  );
}
