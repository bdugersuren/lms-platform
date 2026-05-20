'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import { useMe } from '@/hooks/use-auth';
import { useAdminUsers, useUpdateUserStatus } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { isAdmin } from '@/lib/rbac';
import type { UserProfile } from '@/types/auth';

const ROLE_LABELS: Record<UserProfile['role'], string> = {
  SUPER_ADMIN: 'Супер Админ',
  ADMIN: 'Админ',
  INSTRUCTOR: 'Багш',
  STUDENT: 'Оюутан',
};

const ROLE_COLORS: Record<UserProfile['role'], string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  INSTRUCTOR: 'bg-green-100 text-green-800',
  STUDENT: 'bg-gray-100 text-gray-700',
};

const ROLE_OPTIONS: Array<{ value: UserProfile['role'] | ''; label: string }> = [
  { value: '', label: 'Бүгд' },
  { value: 'STUDENT', label: 'Оюутан' },
  { value: 'INSTRUCTOR', label: 'Багш' },
  { value: 'ADMIN', label: 'Админ' },
  { value: 'SUPER_ADMIN', label: 'Супер Админ' },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: me } = useMe();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<UserProfile['role'] | ''>('');
  const limit = 20;

  const isAdminUser = !!me && isAdmin(me.role);

  const { data, isLoading } = useAdminUsers({
    page,
    limit,
    role: roleFilter || undefined,
    enabled: isAuthenticated && isAdminUser,
  });

  const updateStatus = useUpdateUserStatus();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (me && !isAdmin(me.role)) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, me, router]);

  if (!isAuthenticated || (me && !isAdmin(me.role))) return null;

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  const pendingUserId = updateStatus.isPending ? updateStatus.variables?.id : null;

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    updateStatus.mutate({ id, isActive: !currentStatus });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
              ← Буцах
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Хэрэглэгч удирдлага</h1>
          </div>
          <span className="text-sm text-gray-500">
            {data ? `Нийт ${data.total} хэрэглэгч` : ''}
          </span>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-sm text-gray-600">Эрхийн төрөл:</span>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value as UserProfile['role'] | ''); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">И-мэйл</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Эрх</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Төлөв</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Бүртгэлийн огноо</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {!isLoading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    Хэрэглэгч олдсонгүй
                  </td>
                </tr>
              )}
              {!isLoading && data?.items.map((user) => {
                const role = user.role as UserProfile['role'];
                return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-900">{user.email}</td>
                  <td className="px-5 py-3">
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', ROLE_COLORS[role])}>
                      {ROLE_LABELS[role]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                      {user.isActive ? 'Идэвхтэй' : 'Хаагдсан'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('mn-MN')}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggleStatus(user.id, user.isActive)}
                      disabled={pendingUserId === user.id || user.id === me?.id}
                      className={clsx(
                        'text-xs px-3 py-1 rounded-lg border font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                        user.isActive
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-green-200 text-green-600 hover:bg-green-50',
                      )}
                    >
                      {user.isActive ? 'Хаах' : 'Нээх'}
                    </button>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>{page} / {totalPages} хуудас</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Өмнөх
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Дараах →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
