'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCourse, usePublishCourse, useArchiveCourse, useDeleteCourse } from '@/hooks/use-courses';
import { useCheckEnrollment, useEnroll, useUnenroll, useEnrollmentByCourse } from '@/hooks/use-enrollment';
import { useCreatePayment } from '@/hooks/use-payment';
import { useCertificates } from '@/hooks/use-certificate';
import { useMe } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import type { CourseModule } from '@/types/course';
import { clsx } from 'clsx';

const lessonTypeIcon: Record<string, string> = {
  VIDEO: '▶',
  PDF: '📄',
  MARKDOWN: '📝',
  TEXT: '📝',
  LIVE: '🔴',
  QUIZ: '❓',
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading, error } = useCourse(id);
  const publish = usePublishCourse();
  const archive = useArchiveCourse();
  const deleteCourse = useDeleteCourse();
  const { isAuthenticated } = useAuthStore();
  const { data: user } = useMe();

  const { data: enrollmentCheck } = useCheckEnrollment(id);
  const isEnrolled = enrollmentCheck?.enrolled ?? false;
  const { data: enrollment } = useEnrollmentByCourse(isEnrolled ? id : null);
  const { data: certificates } = useCertificates({ limit: 100, enabled: isAuthenticated && isEnrolled });
  const enroll = useEnroll();
  const unenroll = useUnenroll();

  const createPayment = useCreatePayment();

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState('');
  const [enrollError, setEnrollError] = useState('');

  const course = data?.data;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isOwner = course?.instructorId === user?.id;
  const canManage = isOwner || isAdmin;
  const isPaidCourse = Number(course?.price ?? 0) > 0;
  const courseCertificate = useMemo(
    () => certificates?.items.find((cert) => cert.courseId === id && cert.status === 'ISSUED'),
    [certificates, id],
  );

  const handleBuy = () => {
    if (!course) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    setEnrollError('');
    createPayment.mutate(
      {
        courseId: id,
        amount: Number(course.price),
        provider: 'MOCK',
        description: `Сургалт: ${course.title}`,
      },
      {
        onSuccess: (payment) => router.push(`/payments/${payment.id}`),
        onError: (err) => setEnrollError(err.message),
      },
    );
  };

  const handleEnroll = () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setEnrollError('');
    enroll.mutate(id, {
      onError: (err) => setEnrollError(err.message),
    });
  };

  const handleUnenroll = () => {
    if (!enrollment?.id) return;
    if (!confirm('Бүртгэлээ цуцлах уу?')) return;
    setEnrollError('');
    unenroll.mutate(enrollment.id, {
      onError: (err) => setEnrollError(err.message),
    });
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
      return next;
    });
  };

  const handlePublish = () => {
    setActionError('');
    publish.mutate(id, { onError: (err) => setActionError(err.message) });
  };

  const handleArchive = () => {
    setActionError('');
    archive.mutate(id, { onError: (err) => setActionError(err.message) });
  };

  const handleDelete = () => {
    if (!confirm('Delete this course? This action cannot be undone.')) return;
    deleteCourse.mutate(id, {
      onSuccess: () => router.push('/courses'),
      onError: (err) => setActionError(err.message),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error?.message ?? 'Course not found'}</p>
          <Link href="/courses" className="text-indigo-600 hover:underline text-sm">Back to courses</Link>
        </div>
      </div>
    );
  }

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const freeLessons = course.modules.reduce((sum, m) => sum + m.lessons.filter((l) => l.isPreview).length, 0);

  const sideCard = (
    <div className="p-5 space-y-4">
      {/* Thumbnail */}
      <div className="relative rounded-xl overflow-hidden bg-slate-800 aspect-video flex items-center justify-center group">
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-7xl">📖</span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg">
            <span className="text-slate-900 text-xl ml-1">▶</span>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="text-3xl font-bold text-slate-900">
        {Number(course.price) === 0 ? 'Үнэгүй' : `₮${Number(course.price).toLocaleString('mn-MN')}`}
      </div>

      {/* Error */}
      {enrollError && <p className="text-red-500 text-xs">{enrollError}</p>}

      {/* CTA */}
      {course.status === 'PUBLISHED' && !canManage && (
        isEnrolled ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${enrollment?.progressPercent ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 text-right">{enrollment?.progressPercent ?? 0}% дууссан</p>
            </div>
            {enrollment?.completed ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">Сургалт амжилттай дууссан</p>
                {courseCertificate ? (
                  <>
                    <p className="text-xs text-amber-700 mt-1 line-clamp-1">
                      Сертификат: {courseCertificate.recipientName}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link
                        href="/certificates"
                        className="py-2 bg-amber-500 text-white rounded-lg text-xs font-medium text-center hover:bg-amber-600 transition-colors"
                      >
                        Харах
                      </Link>
                      <Link
                        href={`/certificates/verify/${courseCertificate.verifyCode}`}
                        className="py-2 bg-white text-amber-700 border border-amber-200 rounded-lg text-xs font-medium text-center hover:bg-amber-100 transition-colors"
                      >
                        Баталгаажуулах
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-amber-700 mt-1">
                    Сертификат үүсэж байна. Түр хүлээгээд дахин шалгана уу.
                  </p>
                )}
              </div>
            ) : (
              <Link
                href="/dashboard/my-courses"
                className="block w-full py-3 bg-indigo-600 text-white rounded-lg font-bold text-center hover:bg-indigo-700 transition-colors"
              >
                Үргэлжлүүлэх →
              </Link>
            )}
            {!enrollment?.completed && (
              <button
                onClick={handleUnenroll}
                disabled={unenroll.isPending}
                className="w-full py-2 text-slate-400 text-sm hover:text-red-500 transition-colors"
              >
                {unenroll.isPending ? 'Цуцалж байна...' : 'Бүртгэл цуцлах'}
              </button>
            )}
          </div>
        ) : isPaidCourse ? (
          <div className="space-y-2">
            <button
              onClick={handleBuy}
              disabled={createPayment.isPending}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-lg font-bold text-base hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {createPayment.isPending ? 'Боловсруулж байна...' : 'Худалдан авах'}
            </button>
            <p className="text-xs text-center text-slate-400">Буцаан олголт 30 хоногийн дотор</p>
          </div>
        ) : (
          <button
            onClick={handleEnroll}
            disabled={enroll.isPending}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-lg font-bold text-base hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {enroll.isPending ? 'Бүртгүүлж байна...' : 'Үнэгүй бүртгүүлэх'}
          </button>
        )
      )}

      {canManage && (
        <Link
          href={`/courses/${id}/manage`}
          className="block w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-medium text-center hover:bg-slate-200 transition-colors text-sm"
        >
          Агуулга удирдах
        </Link>
      )}

      {/* Course includes */}
      <div className="border-t border-slate-100 pt-4 space-y-2 text-sm text-slate-600">
        <p className="font-semibold text-slate-800 mb-3">Энэ сургалтад багтсан:</p>
        {totalLessons > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">▶</span>
            <span>{totalLessons} хичээл</span>
          </div>
        )}
        {course.totalMinutes > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">⏱</span>
            <span>{Math.floor(course.totalMinutes / 60)}ц {course.totalMinutes % 60}м нийт хугацаа</span>
          </div>
        )}
        {freeLessons > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">👁</span>
            <span>{freeLessons} үнэгүй хичээл</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">🌐</span>
          <span className="uppercase">{course.language}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">📱</span>
          <span>Утас болон PC-д нэвтрэх</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">🏆</span>
          <span>Гэрчилгээ олгогдоно</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky breadcrumb */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/courses" className="text-slate-500 hover:text-slate-800 text-sm">← Сургалтууд</Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-800 truncate max-w-xs">{course.title}</span>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] items-start">
        {/* LEFT column */}
        <div>
          {/* Dark hero */}
          <div className="bg-slate-900 text-white px-6 sm:px-10 py-10">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={clsx('text-xs px-2.5 py-0.5 rounded-full font-semibold', {
                'bg-green-500/20 text-green-400': course.level === 'BEGINNER',
                'bg-yellow-500/20 text-yellow-400': course.level === 'INTERMEDIATE',
                'bg-red-500/20 text-red-400': course.level === 'ADVANCED',
              })}>
                {course.level}
              </span>
              <span className={clsx('text-xs px-2.5 py-0.5 rounded-full font-semibold', {
                'bg-emerald-500/20 text-emerald-400': course.status === 'PUBLISHED',
                'bg-slate-500/20 text-slate-400': course.status === 'DRAFT',
                'bg-orange-500/20 text-orange-400': course.status === 'ARCHIVED',
              })}>
                {course.status}
              </span>
              {course.tags.map((tag) => (
                <span key={tag} className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-snug">{course.title}</h1>

            {/* Description */}
            {course.description && (
              <p className="text-slate-300 leading-relaxed text-sm sm:text-base mb-5 max-w-2xl">{course.description}</p>
            )}

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400">
              {totalLessons > 0 && (
                <span className="flex items-center gap-1.5"><span>▶</span> {totalLessons} хичээл</span>
              )}
              {course.totalMinutes > 0 && (
                <span className="flex items-center gap-1.5"><span>⏱</span> {course.totalMinutes}м</span>
              )}
              <span className="flex items-center gap-1.5 uppercase"><span>🌐</span> {course.language}</span>
              {freeLessons > 0 && (
                <span className="flex items-center gap-1.5 text-green-400"><span>👁</span> {freeLessons} үнэгүй хичээл</span>
              )}
            </div>

            {/* Admin actions */}
            {canManage && (
              <div className="flex flex-wrap gap-2 mt-6">
                {course.status === 'DRAFT' && (
                  <button
                    onClick={handlePublish}
                    disabled={publish.isPending}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                  >
                    {publish.isPending ? 'Нийтлэж байна...' : 'Нийтлэх'}
                  </button>
                )}
                {course.status === 'PUBLISHED' && (
                  <button
                    onClick={handleArchive}
                    disabled={archive.isPending}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors"
                  >
                    {archive.isPending ? 'Архивлаж байна...' : 'Архивлах'}
                  </button>
                )}
                <Link
                  href={`/courses/${id}/edit`}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  Засах
                </Link>
                <Link
                  href={`/courses/${id}/manage`}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  Агуулга удирдах
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleteCourse.isPending}
                  className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:opacity-60 transition-colors"
                >
                  {deleteCourse.isPending ? 'Устгаж байна...' : 'Устгах'}
                </button>
              </div>
            )}
            {actionError && <p className="mt-3 text-red-400 text-sm">{actionError}</p>}
          </div>

          {/* Mobile-only side card */}
          <div className="lg:hidden bg-white border-b border-slate-200">
            {sideCard}
          </div>

          {/* White content area */}
          <div className="bg-white px-6 sm:px-10 py-8 space-y-8">
            {/* What you'll learn */}
            {course.modules.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Юу сурах вэ</h2>
                <div className="border border-slate-200 rounded-xl p-6">
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {course.modules.map((mod: CourseModule) => (
                      <li key={mod.id} className="flex items-start gap-3 text-sm text-slate-700">
                        <span className="text-indigo-600 mt-0.5 shrink-0 font-bold">✓</span>
                        <span>{mod.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Curriculum */}
            <section>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-xl font-bold text-slate-900">Хичээлийн агуулга</h2>
                <span className="text-sm text-slate-500">
                  {course.modules.length} хэсэг • {totalLessons} хичээл
                  {course.totalMinutes > 0 ? ` • ${course.totalMinutes}м нийт хугацаа` : ''}
                </span>
              </div>

              {course.modules.length === 0 ? (
                <div className="text-center py-12 border border-slate-200 rounded-xl text-slate-400 text-sm">
                  Хичээл байхгүй байна.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {course.modules.map((mod: CourseModule, idx: number) => (
                    <div key={mod.id}>
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                      >
                        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-slate-800 text-sm">{mod.title}</span>
                          <span className="ml-2 text-xs text-slate-400">
                            {mod.lessons.length} хичээл
                          </span>
                        </div>
                        <span className="text-slate-400 text-xs shrink-0">
                          {expandedModules.has(mod.id) ? '▲' : '▼'}
                        </span>
                      </button>

                      {expandedModules.has(mod.id) && (
                        <div className="bg-slate-50">
                          {mod.lessons.length === 0 ? (
                            <p className="px-6 py-3 text-sm text-slate-400">Хичээл байхгүй байна</p>
                          ) : (
                            mod.lessons.map((lesson) => (
                              <Link
                                key={lesson.id}
                                href={`/courses/${id}/lessons/${lesson.id}`}
                                className="flex items-center gap-3 px-5 py-3 border-t border-slate-100 hover:bg-indigo-50 transition-colors group"
                              >
                                <span className="text-slate-400 text-sm w-5 text-center shrink-0">
                                  {lessonTypeIcon[lesson.lessonType] ?? '📄'}
                                </span>
                                <span className="text-sm text-slate-600 flex-1 group-hover:text-indigo-700 transition-colors truncate">
                                  {lesson.title}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  {lesson.isPreview && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Үнэгүй</span>
                                  )}
                                  {lesson.estimatedMinutes != null && lesson.estimatedMinutes > 0 && (
                                    <span className="text-xs text-slate-400">{lesson.estimatedMinutes}м</span>
                                  )}
                                </div>
                              </Link>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* RIGHT column — desktop sticky card */}
        <div className="hidden lg:block border-l border-slate-200 bg-white">
          <div className="sticky top-14">
            {sideCard}
          </div>
        </div>
      </div>
    </div>
  );
}
