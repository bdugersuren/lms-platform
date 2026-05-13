'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMe, useLogout, useLogoutAll, useChangePassword } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { clsx } from 'clsx';

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: user, isLoading } = useMe();
  const logout = useLogout();
  const logoutAll = useLogoutAll();
  const changePassword = useChangePassword();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setPasswordSuccess(true);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmNewPassword('');
          setTimeout(() => setShowPasswordForm(false), 1500);
        },
        onError: (err: Error) => {
          setPasswordError(err.message);
        },
      },
    );
  };

  const roleBadge = (role: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      SUPER_ADMIN: { label: 'Super Admin', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
      ADMIN: { label: 'Admin', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
      INSTRUCTOR: { label: 'Instructor', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
      STUDENT: { label: 'Student', cls: 'bg-green-100 text-green-700 border-green-200' },
    };
    return map[role] ?? { label: role, cls: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">LMS</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">LMS Platform</span>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-700 font-semibold text-xs uppercase">
                    {user.email[0]}
                  </span>
                </div>
                <span className="text-sm text-gray-600 max-w-[180px] truncate">{user.email}</span>
              </div>
              <button
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition-colors"
              >
                {logout.isPending ? (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : user ? (
          <>
            {/* Welcome banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-indigo-200 text-sm font-medium">Welcome back 👋</p>
                  <h1 className="text-xl font-bold mt-1 truncate max-w-sm">{user.email}</h1>
                  <div className="mt-3">
                    <span
                      className={clsx(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                        'bg-white/10 text-white border-white/20',
                      )}
                    >
                      {roleBadge(user.role).label}
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-white uppercase">{user.email[0]}</span>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link
                href="/courses"
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-indigo-200 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <span className="text-xl">📚</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Каталог</p>
                  <p className="text-xs text-slate-400">Курс харах</p>
                </div>
              </Link>
              {(user.role === 'INSTRUCTOR' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                <>
                  <Link
                    href="/courses/manage"
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-indigo-200 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                      <span className="text-xl">⚙️</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Удирдах</p>
                      <p className="text-xs text-slate-400">Курс засах</p>
                    </div>
                  </Link>
                  <Link
                    href="/courses/new"
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-indigo-200 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <span className="text-xl">✏️</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Шинэ курс</p>
                      <p className="text-xs text-slate-400">Үүсгэх</p>
                    </div>
                  </Link>
                </>
              )}
            </div>

            {/* Two-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Account Information
                </h2>
                <dl className="space-y-3">
                  <InfoRow label="Email" value={user.email} />
                  <InfoRow
                    label="Role"
                    value={
                      <span
                        className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                          roleBadge(user.role).cls,
                        )}
                      >
                        {roleBadge(user.role).label}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Status"
                    value={
                      <span className="flex items-center gap-1.5 text-sm text-green-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    }
                  />
                  <InfoRow
                    label="Member since"
                    value={new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  />
                  <InfoRow label="2FA" value={user.mfaEnabled ? 'Enabled' : 'Disabled'} />
                </dl>
              </div>

              {/* Session management */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Session Management
                </h2>
                <div className="space-y-3">
                  <ActionButton
                    label="Sign out of this device"
                    description="Revokes the current session only"
                    onClick={() => logout.mutate()}
                    loading={logout.isPending}
                    variant="secondary"
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    }
                  />
                  <ActionButton
                    label="Sign out everywhere"
                    description="Revokes all active sessions on all devices"
                    onClick={() => logoutAll.mutate()}
                    loading={logoutAll.isPending}
                    variant="danger"
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    }
                  />
                </div>
              </div>
            </div>

            {/* Change password card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <button
                onClick={() => {
                  setShowPasswordForm(!showPasswordForm);
                  setPasswordError('');
                  setPasswordSuccess(false);
                }}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-900">Change Password</span>
                </div>
                <svg
                  className={clsx('w-4 h-4 text-gray-400 transition-transform', showPasswordForm && 'rotate-180')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPasswordForm && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {passwordSuccess ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-green-700 text-sm font-medium">Password changed successfully!</p>
                    </div>
                  ) : (
                    <form onSubmit={handleChangePassword} className="space-y-3">
                      {passwordError && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                          <p className="text-red-600 text-sm">{passwordError}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Current password</label>
                          <input
                            type="password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">New password</label>
                          <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Confirm new</label>
                          <input
                            type="password"
                            required
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={changePassword.isPending}
                          className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all',
                            changePassword.isPending
                              ? 'bg-indigo-400 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]',
                          )}
                        >
                          {changePassword.isPending ? 'Updating…' : 'Update password'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-900 font-medium">{value}</dd>
    </div>
  );
}

function ActionButton({
  label,
  description,
  onClick,
  loading,
  variant,
  icon,
}: {
  label: string;
  description: string;
  onClick: () => void;
  loading: boolean;
  variant: 'secondary' | 'danger';
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={clsx(
        'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
        variant === 'danger'
          ? 'border-red-100 hover:bg-red-50 hover:border-red-200 text-red-600'
          : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200 text-gray-700',
        loading && 'opacity-60 cursor-not-allowed',
      )}
    >
      <div
        className={clsx(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500',
        )}
      >
        {loading ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          icon
        )}
      </div>
      <div>
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
    </button>
  );
}
