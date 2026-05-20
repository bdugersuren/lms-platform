'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMe } from '@/hooks/use-auth';
import { useCourses } from '@/hooks/use-courses';
import { useMyWallet, useRevenueSummary } from '@/hooks/use-wallet';
import { useAuthStore } from '@/store/auth.store';
import { isInstructor, isAdmin } from '@/lib/rbac';
import { Avatar } from '@/components/user/avatar';
import { useMyProfile } from '@/hooks/use-profile';

export default function InstructorDashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: me, isLoading: meLoading } = useMe();
  const { data: profile } = useMyProfile();

  const canTeach = !!me && (isInstructor(me.role) || isAdmin(me.role));

  const { data: coursesData, isLoading: coursesLoading } = useCourses({
    page: 1,
    limit: 5,
    instructorId: me?.id,
  });

  const { data: wallet } = useMyWallet();
  const { data: revenue } = useRevenueSummary();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!meLoading && me && !canTeach) {
      router.replace('/dashboard');
    }
  }, [me, meLoading, canTeach, router]);

  if (!isAuthenticated || meLoading) return null;
  if (me && !canTeach) return null;

  const myCourses = coursesData?.data?.items ?? [];
  const totalCourses = coursesData?.data?.meta?.total ?? 0;
  const balance = parseFloat(String(wallet?.balance ?? '0'));
  const totalRevenue = parseFloat(String(revenue?.totalNet ?? '0'));
  const totalEnrollments = revenue?.enrollmentCount ?? 0;

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
            <span className="text-sm font-semibold text-gray-900">Багшийн самбар</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar avatarUrl={profile?.avatarUrl} displayName={profile?.displayName ?? me?.email ?? ''} size="sm" />
            <span className="text-sm text-gray-600 hidden sm:block">{profile?.displayName ?? me?.email}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Багшийн хяналтын самбар</h1>
          <p className="text-sm text-gray-500 mt-1">Таны сургалт, орлого, оюутнуудын мэдээлэл</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Нийт сургалт"
            value={totalCourses}
            icon="📚"
            color="text-indigo-600"
          />
          <StatCard
            label="Нийт оюутан"
            value={totalEnrollments}
            icon="🎓"
            color="text-blue-600"
          />
          <StatCard
            label="Нийт орлого"
            value={`₮${totalRevenue.toLocaleString()}`}
            icon="💰"
            color="text-emerald-600"
            isText
          />
          <StatCard
            label="Хэтэвчний үлдэгдэл"
            value={`₮${balance.toLocaleString()}`}
            icon="💳"
            color="text-violet-600"
            isText
          />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/courses/new"
            className="flex items-center gap-3 p-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <span className="text-2xl">✏️</span>
            <div>
              <p className="font-semibold text-sm">Шинэ сургалт</p>
              <p className="text-xs text-indigo-200">Курс үүсгэх</p>
            </div>
          </Link>
          <Link
            href="/courses"
            className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-semibold text-sm text-gray-800">Бүх сургалт</p>
              <p className="text-xs text-gray-400">Каталог харах</p>
            </div>
          </Link>
          <Link
            href="/wallet"
            className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all"
          >
            <span className="text-2xl">💳</span>
            <div>
              <p className="font-semibold text-sm text-gray-800">Хэтэвч</p>
              <p className="text-xs text-gray-400">Орлого, гаргалт</p>
            </div>
          </Link>
        </div>

        {/* My courses */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Миний сургалтууд</h2>
            <Link href="/courses" className="text-xs text-indigo-600 hover:text-indigo-800">
              Бүгдийг харах →
            </Link>
          </div>

          {coursesLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : myCourses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📚</p>
              <p className="text-sm text-gray-500 mb-4">Одоогоор сургалт байхгүй байна</p>
              <Link
                href="/courses/new"
                className="inline-flex px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Эхний сургалт үүсгэх
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {myCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-50 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                    <p className="text-xs text-gray-400">{course.level} · {course.language}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <StatusBadge status={course.status} />
                    <Link
                      href={`/courses/${course.id}/manage`}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
                    >
                      Удирдах
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile hint */}
        {profile && !profile.headline && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
            <span className="text-amber-500 text-xl flex-shrink-0">💡</span>
            <div>
              <p className="text-sm font-medium text-amber-800">Профайлаа бөглөнө үү</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Оюутнууд таныг хайхдаа headline болон expertise харах тул профайлаа бөглөсөн байх нь ач холбогдолтой.
              </p>
            </div>
            <Link
              href="/settings/profile"
              className="flex-shrink-0 text-xs font-medium text-amber-700 border border-amber-200 px-3 py-1 rounded-lg hover:bg-amber-100 transition-colors"
            >
              Засах
            </Link>
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
  isText = false,
}: {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  isText?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <span className="text-2xl">{icon}</span>
      <p className={`font-bold mt-2 ${isText ? 'text-base' : 'text-2xl'} ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  ARCHIVED: 'bg-orange-100 text-orange-700',
};

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: 'Нийтлэгдсэн',
  DRAFT: 'Ноорог',
  ARCHIVED: 'Архивласан',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
