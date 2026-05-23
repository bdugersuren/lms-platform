'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useCertificates } from '@/hooks/use-certificate';
import { useMyEnrollments } from '@/hooks/use-enrollment';
import type { Certificate } from '@/types/certificate';

export default function MyCoursesPage() {
  const { data: enrollments, isLoading, error } = useMyEnrollments();
  const { data: certificates } = useCertificates({ limit: 100 });
  const certificateByCourseId = useMemo(() => {
    const map = new Map<string, Certificate>();
    certificates?.items.forEach((cert) => {
      if (cert.courseId && cert.status === 'ISSUED') map.set(cert.courseId, cert);
    });
    return map;
  }, [certificates]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-red-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-800 text-sm">
            ← Хяналтын самбар
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-800">Миний сургалтууд</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Миний сургалтууд</h1>
          <Link
            href="/courses"
            className="text-sm text-indigo-600 hover:underline"
          >
            Сургалт хайх →
          </Link>
        </div>

        {!enrollments || enrollments.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <p className="text-4xl mb-4">📚</p>
            <p className="text-slate-500 mb-6">Та одоогоор ямар ч сургалтад бүртгүүлээгүй байна.</p>
            <Link
              href="/courses"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Сургалт үзэх
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {enrollments.map((enrollment) => {
              const course = enrollment.course;
              return (
                <div
                  key={enrollment.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="h-36 bg-gradient-to-br from-indigo-100 to-slate-100 flex items-center justify-center">
                    {course?.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course?.title ?? ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl">📖</span>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-slate-800 leading-snug line-clamp-2">
                      {course?.title ?? 'Сургалт'}
                    </h3>

                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Явц</span>
                        <span>{enrollment.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${enrollment.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {course?.totalLessons != null && course.totalLessons > 0 && (
                      <p className="text-xs text-slate-400">
                        {course.totalLessons} хичээл
                        {course.totalMinutes > 0 && ` · ${course.totalMinutes} мин`}
                      </p>
                    )}

                    {enrollment.completed ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                          <span>✓</span>
                          <span>Дууссан</span>
                        </div>
                        {certificateByCourseId.get(enrollment.courseId) ? (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs font-semibold text-amber-900">Сертификат бэлэн</p>
                            <p className="text-xs text-amber-700 mt-0.5 line-clamp-1">
                              {certificateByCourseId.get(enrollment.courseId)?.recipientName}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <Link
                                href="/certificates"
                                className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-xs font-medium text-center hover:bg-amber-600 transition-colors"
                              >
                                Харах
                              </Link>
                              <Link
                                href={`/certificates/verify/${certificateByCourseId.get(enrollment.courseId)?.verifyCode}`}
                                className="flex-1 py-2 bg-white text-amber-700 border border-amber-200 rounded-lg text-xs font-medium text-center hover:bg-amber-100 transition-colors"
                              >
                                Баталгаажуулах
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-600">Сертификат үүсэж байна</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Курс дууссан тул удахгүй энд харагдана.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        href={
                          enrollment.nextLessonId
                            ? `/courses/${enrollment.courseId}/lessons/${enrollment.nextLessonId}`
                            : `/courses/${enrollment.courseId}`
                        }
                        className="block w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium text-center hover:bg-indigo-700 transition-colors"
                      >
                        {enrollment.nextLessonId ? 'Үргэлжлүүлэх →' : 'Эхлэх'}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
