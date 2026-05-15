'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePayment, useCheckPayment, useSimulatePayment, useMockPay } from '@/hooks/use-payment';
import { clsx } from 'clsx';
import type { PaymentStatus } from '@/types/payment';

// ── helpers ───────────────────────────────────────────────────────────────────

const StatusMeta: Record<PaymentStatus, { label: string; cls: string; icon: string; desc: string }> = {
  PENDING:    { label: 'Хүлээгдэж байна', icon: '⏳', cls: 'bg-yellow-50 border-yellow-200 text-yellow-700', desc: 'Төлбөрийн нэхэмжлэл үүсгэгдсэн' },
  PROCESSING: { label: 'Боловсруулж байна', icon: '🔄', cls: 'bg-blue-50 border-blue-200 text-blue-700', desc: 'QR скан хийгдсэн, баталгаажуулж байна' },
  COMPLETED:  { label: 'Амжилттай', icon: '✅', cls: 'bg-green-50 border-green-200 text-green-700', desc: 'Төлбөр амжилттай баталгаажлаа' },
  FAILED:     { label: 'Амжилтгүй', icon: '❌', cls: 'bg-red-50 border-red-200 text-red-700', desc: 'Төлбөр амжилтгүй боллоо' },
  REFUNDED:   { label: 'Буцаагдсан', icon: '↩️', cls: 'bg-purple-50 border-purple-200 text-purple-700', desc: 'Мөнгө буцаан шилжүүлэгдсэн' },
  CANCELLED:  { label: 'Цуцлагдсан', icon: '🚫', cls: 'bg-gray-50 border-gray-200 text-gray-500', desc: 'Хугацаа дууссан эсвэл цуцлагдсан' },
};

function fmt(amount: string | number) {
  return Number(amount).toLocaleString('mn-MN') + ' ₮';
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [polling, setPolling] = useState(false);
  const [showSimulateConfirm, setShowSimulateConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: payment, isLoading, refetch } = usePayment(id);
  const checkPayment = useCheckPayment();
  const simulatePayment = useSimulatePayment();
  const mockPay = useMockPay();

  const isActive = payment?.status === 'PROCESSING' || payment?.status === 'PENDING';

  // Auto-poll every 5s while payment is active
  const poll = useCallback(async () => {
    if (!id || !isActive) return;
    await refetch();
  }, [id, isActive, refetch]);

  useEffect(() => {
    if (!isActive) { setPolling(false); return; }
    setPolling(true);
    const timer = setInterval(() => { void poll(); }, 5000);
    return () => clearInterval(timer);
  }, [isActive, poll]);

  const handleManualCheck = () => {
    checkPayment.mutate(id, {
      onSuccess: (updated) => {
        if (updated.status === 'COMPLETED') {
          router.push(`/courses/${updated.courseId}`);
        }
      },
    });
  };

  const handleSimulate = () => {
    simulatePayment.mutate(id, {
      onSuccess: () => {
        setShowSimulateConfirm(false);
        void refetch();
      },
    });
  };

  const handleMockPay = () => {
    mockPay.mutate(id, {
      onSuccess: async () => {
        const result = await refetch();
        if (result.data?.status === 'COMPLETED' && result.data.courseId) {
          router.push(`/courses/${result.data.courseId}`);
        }
      },
    });
  };

  const handleCopyQR = () => {
    if (payment?.qrCode) {
      void navigator.clipboard.writeText(payment.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500">Төлбөр олдсонгүй</p>
          <Link href="/payments" className="mt-4 inline-block text-indigo-600 hover:underline text-sm">Буцах</Link>
        </div>
      </div>
    );
  }

  const sm = StatusMeta[payment.status];
  const deepLinks = Array.isArray(payment.deepLinks) ? payment.deepLinks : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/payments" className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-lg">💳</span>
          <h1 className="font-semibold text-gray-900 text-sm">Төлбөрийн дэлгэрэнгүй</h1>
          {polling && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-indigo-500">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Шалгаж байна…
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Status card */}
        <div className={clsx('rounded-2xl border p-5', sm.cls)}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{sm.icon}</span>
            <div>
              <p className="font-bold text-lg">{sm.label}</p>
              <p className="text-sm opacity-80">{sm.desc}</p>
            </div>
          </div>
        </div>

        {/* Amount card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Төлбөрийн мэдээлэл</h2>
            <span className={clsx(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              payment.provider === 'QPAY' ? 'bg-indigo-50 text-indigo-700'
                : payment.provider === 'MOCK' ? 'bg-emerald-50 text-emerald-700'
                : 'bg-blue-50 text-blue-700',
            )}>
              {payment.provider === 'QPAY' ? 'QPay' : payment.provider === 'MOCK' ? '🧪 Mock' : 'SocialPay'}
            </span>
          </div>
          <div className="text-center py-2 mb-4">
            <p className="text-4xl font-bold text-gray-900">{fmt(payment.amount)}</p>
            <p className="text-sm text-gray-400 mt-1">{payment.currency}</p>
          </div>
          <dl className="space-y-2 text-sm">
            {payment.description && (
              <Row label="Тайлбар" value={payment.description} />
            )}
            <Row label="Дугаар" value={<span className="font-mono text-xs">{payment.id}</span>} />
            <Row label="Үүссэн" value={new Date(payment.createdAt).toLocaleString('mn-MN')} />
            {payment.completedAt && (
              <Row label="Дууссан" value={new Date(payment.completedAt).toLocaleString('mn-MN')} />
            )}
            {payment.expiredAt && isActive && (
              <Row
                label="Дуусах хугацаа"
                value={<span className="text-orange-600">{new Date(payment.expiredAt).toLocaleString('mn-MN')}</span>}
              />
            )}
            {payment.externalRef && (
              <Row label="Гүйлгээний дугаар" value={<span className="font-mono text-xs">{payment.externalRef}</span>} />
            )}
          </dl>
        </div>

        {/* QPay QR code */}
        {payment.provider === 'QPAY' && isActive && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">QPay QR код</h2>
            <p className="text-xs text-gray-400 mb-4 text-center">
              Банкны аппликейшнаар доорх QR кодыг скан хийн төлбөрөө төлнө үү
            </p>

            {payment.qrImage ? (
              <div className="flex justify-center mb-4">
                <div className="p-3 border-2 border-gray-100 rounded-xl bg-white inline-block">
                  <img
                    src={`data:image/svg+xml;base64,${payment.qrImage}`}
                    alt="QPay QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>
            ) : payment.qrCode ? (
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center">
                <p className="font-mono text-xs text-gray-600 break-all">{payment.qrCode}</p>
              </div>
            ) : null}

            {payment.qrCode && (
              <button
                onClick={handleCopyQR}
                className="w-full py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
              >
                {copied ? '✅ Хуулагдлаа' : '📋 QR текст хуулах'}
              </button>
            )}

            {/* Deep links (bank apps) */}
            {deepLinks.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-2 text-center">Банкны аппаар нэвтрэх</p>
                <div className="grid grid-cols-3 gap-2">
                  {deepLinks.map((dl) => (
                    <a
                      key={dl.name}
                      href={dl.link}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                    >
                      {dl.logo ? (
                        <img src={dl.logo} alt={dl.name} className="w-8 h-8 rounded-lg object-contain" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                          {dl.name[0]}
                        </div>
                      )}
                      <span className="text-xs text-gray-600 text-center leading-tight">{dl.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SocialPay checkout link */}
        {payment.provider === 'SOCIAL_PAY' && isActive && payment.checkoutUrl && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">SocialPay</h2>
            <p className="text-xs text-gray-400 mb-4">
              Доорх товчийг дарж SocialPay-ийн төлбөрийн хуудас руу шилжинэ үү
            </p>
            <a
              href={payment.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold text-center hover:bg-blue-700 transition-colors"
            >
              SocialPay-ээр төлөх →
            </a>
          </div>
        )}

        {/* Mock payment panel */}
        {payment.provider === 'MOCK' && isActive && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🧪</span>
              <h2 className="text-sm font-semibold text-emerald-800">Mock Provider</h2>
            </div>
            <p className="text-xs text-emerald-700 mb-5">
              Энэ бол тест орчны төлбөр. Доорх товчийг дарахад төлбөр шууд амжилттай болно.
            </p>
            <button
              onClick={handleMockPay}
              disabled={mockPay.isPending}
              className={clsx(
                'w-full py-3.5 rounded-xl text-sm font-bold transition-all',
                mockPay.isPending
                  ? 'bg-emerald-300 text-white cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] shadow-md shadow-emerald-200',
              )}
            >
              {mockPay.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Боловсруулж байна…
                </span>
              ) : '💳 Одоо төлөх (Mock)'}
            </button>
          </div>
        )}

        {/* Action buttons */}
        {isActive && (
          <div className="space-y-3">
            <button
              onClick={handleManualCheck}
              disabled={checkPayment.isPending}
              className={clsx(
                'w-full py-3 rounded-xl text-sm font-semibold transition-all',
                checkPayment.isPending
                  ? 'bg-indigo-400 text-white cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]',
              )}
            >
              {checkPayment.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Шалгаж байна…
                </span>
              ) : '🔍 Төлбөр шалгах'}
            </button>

            {/* DEV only: simulate button */}
            {!showSimulateConfirm ? (
              <button
                onClick={() => setShowSimulateConfirm(true)}
                className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-xs text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-all"
              >
                🧪 [DEV] Төлбөр симуляц хийх
              </button>
            ) : (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-xs text-orange-700 text-center mb-3">
                  Энэ нь зөвхөн хөгжүүлэлтийн орчинд ажиллана. Төлбөрийг амжилттай болгох уу?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSimulateConfirm(false)}
                    className="flex-1 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-gray-300"
                  >
                    Болих
                  </button>
                  <button
                    onClick={handleSimulate}
                    disabled={simulatePayment.isPending}
                    className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60"
                  >
                    {simulatePayment.isPending ? 'Боловсруулж байна…' : 'Тийм, амжилттай болгох'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success state */}
        {payment.status === 'COMPLETED' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <p className="text-4xl mb-2">🎉</p>
            <p className="font-bold text-green-700 mb-1">Төлбөр амжилттай!</p>
            <p className="text-sm text-green-600 mb-4">
              Таны сургалтад элссэн байна. Хэдэн секундын дотор нэвтрэх боломжтой болно.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/courses/${payment.courseId}`}
                className="inline-block px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Сургалт руу очих →
              </Link>
              <Link
                href="/payments"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Төлбөрийн түүх харах
              </Link>
            </div>
          </div>
        )}

        {/* Failed state */}
        {(payment.status === 'FAILED' || payment.status === 'CANCELLED') && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
            <p className="text-sm text-gray-500 mb-4">Дахин оролдох уу?</p>
            <Link
              href={`/courses/${payment.courseId}`}
              className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Курс руу буцах
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <dt className="text-gray-400 flex-shrink-0">{label}</dt>
      <dd className="text-gray-800 font-medium text-right">{value}</dd>
    </div>
  );
}
