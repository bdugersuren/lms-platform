'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMe, useAdminUsers } from '@/hooks/use-auth';
import { useCourses } from '@/hooks/use-courses';
import { useAuthStore } from '@/store/auth.store';
import { isAdmin } from '@/lib/rbac';

const ADMIN_SECTIONS = [
  {
    href: '/admin/users',
    icon: '👥',
    title: 'Хэрэглэгч удирдлага',
    description: 'Хэрэглэгчдийн жагсаалт, эрх, идэвхийг удирдах',
    color: 'bg-blue-50 border-blue-100 hover:border-blue-300',
    iconBg: 'bg-blue-100',
  },
  {
    href: '/admin/settings',
    icon: '⚙️',
    title: 'Байгууллагын тохиргоо',
    description: 'Брэндинг, SEO, нийгмийн сүлжээний линк',
    color: 'bg-indigo-50 border-indigo-100 hover:border-indigo-300',
    iconBg: 'bg-indigo-100',
  },
  {
    href: '/admin/features',
    icon: '🔧',
    title: 'Функц тохиргоо',
    description: 'AI, Хэтэвч, Гэрчилгээ зэрэг функцуудыг идэвхжүүлэх',
    color: 'bg-violet-50 border-violet-100 hover:border-violet-300',
    iconBg: 'bg-violet-100',
  },
  {
    href: '/admin/cms',
    icon: '📄',
    title: 'CMS Удирдлага',
    description: 'Нүүр хуудасны секцүүд, контент засах',
    color: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300',
    iconBg: 'bg-emerald-100',
  },
];

export default function AdminPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: me, isLoading: meLoading } = useMe();

  const isAdminUser = !!me && isAdmin(me.role);

  const { data: usersData } = useAdminUsers({
    page: 1,
    limit: 1,
    enabled: isAuthenticated && isAdminUser,
  });

  const { data: coursesData } = useCourses({ page: 1, limit: 1 });

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!meLoading && me && !isAdmin(me.role)) {
      router.replace('/dashboard');
    }
  }, [me, meLoading, router]);

  if (!isAuthenticated || meLoading) return null;
  if (me && !isAdmin(me.role)) return null;

  const totalUsers = usersData?.total ?? 0;
  const totalCourses = coursesData?.data?.meta?.total ?? 0;

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
            <span className="text-sm font-semibold text-gray-900">Админ</span>
          </div>
          <Link
            href="/admin/users"
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Хэрэглэгчид →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Админ хяналтын самбар</h1>
          <p className="text-sm text-gray-500 mt-1">Платформын удирдлага ба тохиргоо</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Нийт хэрэглэгч" value={totalUsers} icon="👤" color="text-blue-600" />
          <StatCard label="Нийт сургалт" value={totalCourses} icon="📚" color="text-indigo-600" />
          <StatCard label="Эрх" value={me?.role === 'SUPER_ADMIN' ? 'Супер Админ' : 'Админ'} icon="🛡️" color="text-violet-600" isText />
          <StatCard label="Системийн төлөв" value="Идэвхтэй" icon="✅" color="text-emerald-600" isText />
        </div>

        {/* Admin section cards */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Удирдлагын хэсгүүд
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ADMIN_SECTIONS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className={`flex items-start gap-4 p-5 rounded-xl border transition-all ${section.color}`}
              >
                <div className={`w-12 h-12 ${section.iconBg} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
                  {section.icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{section.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{section.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick user management link */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Хурдан үйлдэл</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/admin/users?role=INSTRUCTOR"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg">🎓</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Багш нар</p>
                <p className="text-xs text-gray-400">INSTRUCTOR жагсаалт</p>
              </div>
            </Link>
            <Link
              href="/admin/users?role=STUDENT"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg">📖</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Оюутан нар</p>
                <p className="text-xs text-gray-400">STUDENT жагсаалт</p>
              </div>
            </Link>
            <Link
              href="/courses"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg">📚</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Сургалтууд</p>
                <p className="text-xs text-gray-400">Бүх курсын жагсаалт</p>
              </div>
            </Link>
          </div>
        </div>
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
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`font-bold ${isText ? 'text-base' : 'text-2xl'} ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
