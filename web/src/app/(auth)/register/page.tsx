'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRegister } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { clsx } from 'clsx';

export default function RegisterPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const register = useRegister();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password);
    if (!strongPassword) {
      setValidationError('Password must contain uppercase, lowercase, number, and special character');
      return;
    }

    register.mutate({ email, password });
  };

  const error = validationError || register.error?.message;

  return (
    <div className="min-h-screen flex">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">LMS</span>
          </div>
          <span className="text-white font-semibold text-lg">LMS Platform</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Start learning
            <br />
            <span className="text-indigo-400">today for free</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
            Join thousands of learners. Create your account and unlock access to
            courses, quizzes, and AI-powered learning tools.
          </p>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">✦</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Free to get started</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  Create your account in under 30 seconds. No credit card required.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-slate-600 text-xs">© 2026 LMS Platform. All rights reserved.</p>
      </div>

      {/* Right: form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">LMS</span>
            </div>
            <span className="font-semibold text-gray-900">LMS Platform</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
              <p className="text-gray-500 mt-1 text-sm">Get started in less than a minute</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 chars with A-z, 0-9, !@#"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={clsx(
                    'w-full px-3.5 py-2.5 rounded-lg border text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow',
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-200 focus:ring-indigo-500',
                  )}
                />
              </div>

              {/* Password strength hint */}
              {password && (
                <PasswordStrength password={password} />
              )}

              <button
                type="submit"
                disabled={register.isPending}
                className={clsx(
                  'w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white transition-all',
                  register.isPending
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-sm hover:shadow-md',
                )}
              >
                {register.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account…
                  </span>
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-600 font-medium hover:text-indigo-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase (A-Z)', pass: /[A-Z]/.test(password) },
    { label: 'Number (0-9)', pass: /\d/.test(password) },
    { label: 'Special (!@#…)', pass: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const score = checks.filter((c) => c.pass).length;
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400'];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={clsx(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              i < score ? colors[score - 1] : 'bg-gray-200',
            )}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((c) => (
          <span
            key={c.label}
            className={clsx(
              'text-xs flex items-center gap-1',
              c.pass ? 'text-green-600' : 'text-gray-400',
            )}
          >
            <span>{c.pass ? '✓' : '○'}</span>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
