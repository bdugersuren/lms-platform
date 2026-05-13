'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useMyWallet,
  useInitWallet,
  useTransactions,
  useRevenueSummary,
  useRevenueHistory,
  useMyPayouts,
  useRequestPayout,
} from '@/hooks/use-wallet';
import { clsx } from 'clsx';
import type { TransactionType, PayoutStatus } from '@/types/wallet';

// ── helpers ──────────────────────────────────────────────────────────────────

const TXMeta: Record<TransactionType, { icon: string; label: string; sign: '+' | '-' }> = {
  CREDIT:       { icon: '💰', label: 'Орлого',          sign: '+' },
  REVENUE_SHARE:{ icon: '📊', label: 'Орлогын хувь',    sign: '+' },
  REFUND:       { icon: '↩️', label: 'Буцаалт',         sign: '+' },
  DEBIT:        { icon: '💸', label: 'Зарцуулалт',      sign: '-' },
  PAYOUT:       { icon: '🏦', label: 'Гадагш гаргалт',  sign: '-' },
  PLATFORM_FEE: { icon: '🏛️', label: 'Платформ хураамж', sign: '-' },
};

const PayoutMeta: Record<PayoutStatus, { label: string; cls: string }> = {
  PENDING:    { label: 'Хүлээгдэж байна', cls: 'bg-yellow-100 text-yellow-700' },
  PROCESSING: { label: 'Боловсруулж байна', cls: 'bg-blue-100 text-blue-700' },
  COMPLETED:  { label: 'Гүйцэтгэсэн', cls: 'bg-green-100 text-green-700' },
  REJECTED:   { label: 'Татгалзсан', cls: 'bg-red-100 text-red-700' },
};

function fmt(amount: string | number) {
  return Number(amount).toLocaleString('mn-MN', { minimumFractionDigits: 0 });
}

// ── tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'transactions' | 'revenue' | 'payouts';

// ── page ─────────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [payoutPage, setPayoutPage] = useState(1);
  const [revPage, setRevPage] = useState(1);

  const { data: wallet, isLoading: walletLoading, isError: walletError } = useMyWallet();
  const initWallet = useInitWallet();
  const { data: txData, isLoading: txLoading } = useTransactions(txPage);
  const { data: revSummary } = useRevenueSummary();
  const { data: revHistory } = useRevenueHistory(revPage);
  const { data: payoutData } = useMyPayouts(payoutPage);
  const requestPayout = useRequestPayout();

  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
    note: '',
  });

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestPayout.mutateAsync({
      amount: Number(payoutForm.amount),
      bankName: payoutForm.bankName || undefined,
      accountNumber: payoutForm.accountNumber || undefined,
      accountName: payoutForm.accountName || undefined,
      note: payoutForm.note || undefined,
    });
    setShowPayoutForm(false);
    setPayoutForm({ amount: '', bankName: '', accountNumber: '', accountName: '', note: '' });
    setTab('payouts');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-xl">💳</span>
            <span className="font-semibold text-gray-900">Хэтэвч</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Wallet not found */}
        {walletError && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-5xl mb-4">💳</p>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Хэтэвч байхгүй байна</h2>
            <p className="text-sm text-gray-500 mb-6">Хэтэвчээ идэвхжүүлж эхлэнэ үү.</p>
            <button
              onClick={() => initWallet.mutate()}
              disabled={initWallet.isPending}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {initWallet.isPending ? 'Үүсгэж байна...' : 'Хэтэвч үүсгэх'}
            </button>
          </div>
        )}

        {walletLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {wallet && (
          <>
            {/* Balance card */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-indigo-200 text-sm mb-1">Нийт үлдэгдэл</p>
                  <p className="text-4xl font-bold tracking-tight">
                    ₮{fmt(wallet.balance)}
                  </p>
                  <p className="text-indigo-300 text-sm mt-1">{wallet.currency}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={clsx(
                    'px-2.5 py-0.5 rounded-full text-xs font-medium',
                    wallet.status === 'ACTIVE' ? 'bg-green-400/20 text-green-200' : 'bg-red-400/20 text-red-200',
                  )}>
                    {wallet.status === 'ACTIVE' ? '● Идэвхтэй' : wallet.status}
                  </span>
                  {wallet.status === 'ACTIVE' && (
                    <button
                      onClick={() => { setShowPayoutForm(true); setTab('payouts'); }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors border border-white/20"
                    >
                      Мөнгө гаргах
                    </button>
                  )}
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/10">
                <div>
                  <p className="text-indigo-300 text-xs">Нийт гүйлгээ</p>
                  <p className="text-white font-semibold text-sm mt-0.5">
                    {wallet._count?.transactions ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-indigo-300 text-xs">Нийт орлого</p>
                  <p className="text-white font-semibold text-sm mt-0.5">
                    {revSummary ? `₮${fmt(revSummary.totalNet)}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-indigo-300 text-xs">Гадагш гарсан</p>
                  <p className="text-white font-semibold text-sm mt-0.5">
                    {wallet._count?.payouts ?? 0} удаа
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1">
              {([
                ['overview', '📊', 'Хураангуй'],
                ['transactions', '📋', 'Гүйлгээ'],
                ['revenue', '💹', 'Орлого'],
                ['payouts', '🏦', 'Гаргалт'],
              ] as [Tab, string, string][]).map(([id, icon, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all',
                    tab === id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <span>{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'overview' && <OverviewTab revSummary={revSummary} txData={txData} />}
            {tab === 'transactions' && (
              <TransactionsTab
                txData={txData}
                txLoading={txLoading}
                txPage={txPage}
                setTxPage={setTxPage}
              />
            )}
            {tab === 'revenue' && <RevenueTab revSummary={revSummary} revHistory={revHistory} revPage={revPage} setRevPage={setRevPage} />}
            {tab === 'payouts' && (
              <PayoutsTab
                payoutData={payoutData}
                payoutPage={payoutPage}
                setPayoutPage={setPayoutPage}
                showPayoutForm={showPayoutForm}
                setShowPayoutForm={setShowPayoutForm}
                payoutForm={payoutForm}
                setPayoutForm={setPayoutForm}
                handlePayout={handlePayout}
                requestPayout={requestPayout}
                walletBalance={wallet.balance}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function OverviewTab({ revSummary, txData }: { revSummary: any; txData: any }) {
  return (
    <div className="space-y-4">
      {revSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Нийт борлуулалт', value: `₮${fmt(revSummary.totalGross)}`, icon: '💰' },
            { label: 'Платформ хураамж', value: `₮${fmt(revSummary.totalPlatformFee)}`, icon: '🏛️' },
            { label: 'Цэвэр орлого', value: `₮${fmt(revSummary.totalNet)}`, icon: '📈' },
            { label: 'Бүртгэлийн тоо', value: String(revSummary.enrollmentCount), icon: '👥' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl">{s.icon}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {txData?.items?.slice(0, 5).map((tx: any) => <TxRow key={tx.id} tx={tx} />)}
    </div>
  );
}

function TransactionsTab({ txData, txLoading, txPage, setTxPage }: any) {
  if (txLoading) return <Spinner />;
  if (!txData?.items?.length) return <Empty text="Гүйлгээний түүх хоосон байна." />;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-50">
        {txData.items.map((tx: any) => <TxRow key={tx.id} tx={tx} />)}
      </div>
      <Pagination page={txPage} setPage={setTxPage} totalPages={txData.totalPages} />
    </div>
  );
}

function RevenueTab({ revSummary, revHistory, revPage, setRevPage }: any) {
  return (
    <div className="space-y-4">
      {revSummary && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Орлогын хураангуй</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-gray-500">Нийт борлуулалт</p>
              <p className="text-lg font-bold text-gray-900 mt-1">₮{fmt(revSummary.totalGross)}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <p className="text-xs text-gray-500">Платформ (20%)</p>
              <p className="text-lg font-bold text-red-600 mt-1">₮{fmt(revSummary.totalPlatformFee)}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <p className="text-xs text-gray-500">Таны орлого (80%)</p>
              <p className="text-lg font-bold text-green-700 mt-1">₮{fmt(revSummary.totalNet)}</p>
            </div>
          </div>
        </div>
      )}

      {revHistory?.items?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {revHistory.items.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm text-gray-800">Бүртгэлийн орлого</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString('mn-MN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">+₮{fmt(r.netAmount)}</p>
                  <p className="text-xs text-gray-400">Нийт: ₮{fmt(r.grossAmount)}</p>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={revPage} setPage={setRevPage} totalPages={revHistory.totalPages} />
        </div>
      )}
    </div>
  );
}

function PayoutsTab({ payoutData, payoutPage, setPayoutPage, showPayoutForm, setShowPayoutForm, payoutForm, setPayoutForm, handlePayout, requestPayout, walletBalance }: any) {
  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowPayoutForm(!showPayoutForm)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
      >
        🏦 Мөнгө гаргах хүсэлт
      </button>

      {showPayoutForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Гаргалтын хүсэлт</h3>
          <p className="text-xs text-gray-500 mb-4">Одоогийн үлдэгдэл: <span className="font-semibold text-gray-800">₮{fmt(walletBalance)}</span></p>
          <form onSubmit={handlePayout} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Дүн (₮) *</label>
                <input
                  type="number"
                  required
                  min={1000}
                  max={Number(walletBalance)}
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm((p: any) => ({ ...p, amount: e.target.value }))}
                  placeholder="50000"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Банкны нэр</label>
                <input
                  type="text"
                  value={payoutForm.bankName}
                  onChange={(e) => setPayoutForm((p: any) => ({ ...p, bankName: e.target.value }))}
                  placeholder="Голомт банк"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Дансны дугаар</label>
                <input
                  type="text"
                  value={payoutForm.accountNumber}
                  onChange={(e) => setPayoutForm((p: any) => ({ ...p, accountNumber: e.target.value }))}
                  placeholder="1234567890"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Дансны нэр</label>
                <input
                  type="text"
                  value={payoutForm.accountName}
                  onChange={(e) => setPayoutForm((p: any) => ({ ...p, accountName: e.target.value }))}
                  placeholder="Б. Болд"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Тэмдэглэл</label>
              <input
                type="text"
                value={payoutForm.note}
                onChange={(e) => setPayoutForm((p: any) => ({ ...p, note: e.target.value }))}
                placeholder="Нэмэлт мэдээлэл..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {requestPayout.isError && (
              <p className="text-sm text-red-500">{requestPayout.error.message}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={requestPayout.isPending}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {requestPayout.isPending ? 'Илгээж байна...' : 'Хүсэлт илгээх'}
              </button>
              <button type="button" onClick={() => setShowPayoutForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Болих
              </button>
            </div>
          </form>
        </div>
      )}

      {payoutData?.items?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {payoutData.items.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">₮{fmt(p.amount)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.bankName ? `${p.bankName} · ${p.accountNumber ?? '—'}` : '—'}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString('mn-MN')}</p>
                </div>
                <div className="text-right">
                  <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', PayoutMeta[p.status as PayoutStatus].cls)}>
                    {PayoutMeta[p.status as PayoutStatus].label}
                  </span>
                  {p.rejectedReason && (
                    <p className="text-xs text-red-500 mt-1 max-w-[140px] text-right">{p.rejectedReason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={payoutPage} setPage={setPayoutPage} totalPages={payoutData.totalPages} />
        </div>
      )}

      {!payoutData?.items?.length && !showPayoutForm && <Empty text="Гаргалтын түүх хоосон байна." />}
    </div>
  );
}

function TxRow({ tx }: { tx: any }) {
  const meta = TXMeta[tx.type as TransactionType] ?? { icon: '•', label: tx.type, sign: '+' as const };
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div className="flex items-center gap-3">
        <span className="text-xl">{meta.icon}</span>
        <div>
          <p className="text-sm text-gray-800">{tx.description ?? meta.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{new Date(tx.createdAt).toLocaleDateString('mn-MN')}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={clsx('text-sm font-semibold', meta.sign === '+' ? 'text-green-600' : 'text-red-500')}>
          {meta.sign}₮{fmt(tx.amount)}
        </p>
        <p className="text-xs text-gray-400">Үлдэгдэл: ₮{fmt(tx.balanceAfter)}</p>
      </div>
    </div>
  );
}

function Pagination({ page, setPage, totalPages }: { page: number; setPage: (p: number) => void; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
      <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="text-xs text-indigo-600 disabled:text-gray-300 hover:underline">← Өмнөх</button>
      <span className="text-xs text-gray-400">{page} / {totalPages}</span>
      <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="text-xs text-indigo-600 disabled:text-gray-300 hover:underline">Дараах →</button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-14 text-gray-400">
      <p className="text-3xl mb-3">📭</p>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

