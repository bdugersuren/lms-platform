'use client';

import { useState } from 'react';
import { useMyPayments } from '@/hooks/use-payment';
import { clsx } from 'clsx';
import type { PaymentStatus, PaymentProvider } from '@/types/payment';
import Link from 'next/link';

// ── helpers ───────────────────────────────────────────────────────────────────

const StatusMeta: Record<PaymentStatus, { label: string; cls: string; icon: string }> = {
  PENDING:    { label: 'Хүлээгдэж байна', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200',   icon: '⏳' },
  PROCESSING: { label: 'Боловсруулж байна', cls: 'bg-blue-50 text-blue-700 border-blue-200',       icon: '🔄' },
  COMPLETED:  { label: 'Амжилттай',        cls: 'bg-green-50 text-green-700 border-green-200',     icon: '✅' },
  FAILED:     { label: 'Амжилтгүй',        cls: 'bg-red-50 text-red-700 border-red-200',           icon: '❌' },
  REFUNDED:   { label: 'Буцаагдсан',       cls: 'bg-purple-50 text-purple-700 border-purple-200',  icon: '↩️' },
  CANCELLED:  { label: 'Цуцлагдсан',       cls: 'bg-gray-50 text-gray-500 border-gray-200',        icon: '🚫' },
};

const ProviderMeta: Record<PaymentProvider, { label: string; color: string }> = {
  QPAY:       { label: 'QPay',       color: 'text-indigo-600' },
  SOCIAL_PAY: { label: 'SocialPay',  color: 'text-blue-600' },
  MOCK:       { label: '🧪 Mock',    color: 'text-emerald-600' },
  WALLET:     { label: '💳 Хэтэвч',  color: 'text-violet-600' },
};

function fmt(amount: string | number) {
  return Number(amount).toLocaleString('mn-MN') + ' ₮';
}

const STATUS_OPTIONS: Array<{ value: PaymentStatus | ''; label: string }> = [
  { value: '',           label: 'Бүгд' },
  { value: 'PENDING',    label: 'Хүлээгдэж байна' },
  { value: 'PROCESSING', label: 'Боловсруулж байна' },
  { value: 'COMPLETED',  label: 'Амжилттай' },
  { value: 'FAILED',     label: 'Амжилтгүй' },
  { value: 'CANCELLED',  label: 'Цуцлагдсан' },
];

// ── page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');

  const { data, isLoading } = useMyPayments(page, statusFilter || undefined);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-lg">💳</span>
          <h1 className="font-semibold text-gray-900 text-sm">Миний төлбөрүүд</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value as PaymentStatus | ''); setPage(1); }}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                statusFilter === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data?.items.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-gray-500 text-sm">Төлбөрийн түүх байхгүй байна</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.items.map((payment) => {
              const sm = StatusMeta[payment.status];
              const pm = ProviderMeta[payment.provider];
              return (
                <Link
                  key={payment.id}
                  href={`/payments/${payment.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-indigo-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border', sm.cls)}>
                          {sm.icon} {sm.label}
                        </span>
                        <span className={clsx('text-xs font-semibold', pm.color)}>{pm.label}</span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {payment.description ?? `Курс: ${payment.courseId.slice(0, 8)}…`}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(payment.createdAt).toLocaleString('mn-MN')}
                        {payment.completedAt && ` · Дууссан: ${new Date(payment.completedAt).toLocaleString('mn-MN')}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900 text-lg">{fmt(payment.amount)}</p>
                      <p className="text-xs text-gray-400">{payment.currency}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:border-indigo-300 transition-all"
            >
              ‹ Өмнөх
            </button>
            <span className="text-sm text-gray-500">{page} / {data.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:border-indigo-300 transition-all"
            >
              Дараах ›
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
