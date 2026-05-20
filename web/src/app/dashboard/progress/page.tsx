'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useMyEnrollments, type Enrollment } from '@/hooks/use-enrollment';
import { useCertificates } from '@/hooks/use-certificate';

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className="bg-indigo-600 h-2 rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function EnrollmentCard({ enrollment }: { enrollment: Enrollment }) {
  const course = enrollment.course;
  const pct = Math.round(enrollment.progressPercent ?? 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-indigo-200 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {course?.title ?? 'Сургалт'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {course?.totalLessons ?? 0} хичээл · {course?.totalMinutes ?? 0} мин
          </p>
        </div>
        {enrollment.completed ? (
          <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
            ✓ Дууссан
          </span>
        ) : (
          <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
            Үргэлжлэлтэй
          </span>
        )}
      </div>

      <ProgressBar percent={pct} />

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{pct}% дууссан</span>
          {enrollment.totalScore > 0 && (
            <span>Оноо: {enrollment.totalScore.toFixed(0)}</span>
          )}
        </div>
        <Link
          href={`/courses/${enrollment.courseId}`}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Үргэлжлүүлэх →
        </Link>
      </div>
    </div>
  );
}

export default function StudentProgressPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: enrollments, isLoading: enrollmentsLoading } = useMyEnrollments();
  const { data: certsData } = useCertificates({ limit: 100 });

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const allEnrollments = enrollments ?? [];
  const completed = allEnrollments.filter((e) => e.completed);
  const inProgress = allEnrollments.filter((e) => !e.completed);
  const certs = certsData?.items ?? [];

  const avgProgress =
    allEnrollments.length > 0
      ? Math.round(allEnrollments.reduce((sum, e) => sum + (e.progressPercent ?? 0), 0) / allEnrollments.length)
      : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              ← Хяналтын самбар
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-900">Миний явц</span>
          </div>
          <Link href="/courses" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            Сургалтын каталог →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Миний суралцах явц</h1>
          <p className="text-sm text-gray-500 mt-1">Бүх сургалт дахь явц, оноо, гэрчилгээ</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Нийт бүртгэл" value={allEnrollments.length} icon="📚" color="text-indigo-600" />
          <StatCard label="Үргэлжлэлтэй" value={inProgress.length} icon="⏳" color="text-blue-600" />
          <StatCard label="Дууссан" value={completed.length} icon="✅" color="text-emerald-600" />
          <StatCard label="Гэрчилгээ" value={certs.length} icon="🏆" color="text-amber-600" />
        </div>

        {/* Overall progress */}
        {allEnrollments.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white">
            <p className="text-indigo-200 text-sm font-medium mb-1">Нийт дундаж явц</p>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold">{avgProgress}%</p>
              <p className="text-indigo-200 text-sm pb-1">{allEnrollments.length} сургалт дотроос</p>
            </div>
            <div className="mt-4 bg-indigo-500/30 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all"
                style={{ width: `${avgProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* In-progress courses */}
        {enrollmentsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : allEnrollments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-5xl mb-4">📚</p>
            <p className="font-semibold text-gray-800 mb-2">Бүртгэгдсэн сургалт байхгүй</p>
            <p className="text-sm text-gray-500 mb-6">Сургалтын каталогоос сургалт сонгоно уу</p>
            <Link
              href="/courses"
              className="inline-flex px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Каталог харах
            </Link>
          </div>
        ) : (
          <>
            {inProgress.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                  Үргэлжлэлтэй ({inProgress.length})
                </h2>
                <div className="space-y-3">
                  {inProgress.map((e) => <EnrollmentCard key={e.id} enrollment={e} />)}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                  Дууссан ({completed.length})
                </h2>
                <div className="space-y-3">
                  {completed.map((e) => <EnrollmentCard key={e.id} enrollment={e} />)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Certificates */}
        {certs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Гэрчилгээ ({certs.length})
              </h2>
              <Link href="/certificates" className="text-xs text-indigo-600 hover:text-indigo-800">
                Бүгдийг харах →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {certs.slice(0, 4).map((cert) => (
                <div key={cert.id} className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🏆</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-amber-700 truncate">{cert.verifyCode}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(cert.issuedAt).toLocaleDateString('mn-MN')}
                      </p>
                    </div>
                    <Link
                      href={`/certificates/verify/${cert.verifyCode}`}
                      className="text-xs text-amber-700 hover:text-amber-900 font-medium"
                    >
                      Шалгах
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <span className="text-2xl">{icon}</span>
      <p className={`text-2xl font-bold mt-2 ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
