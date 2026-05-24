'use client';

import { useState } from 'react';
import {
  useCertificates,
  useIssueCertificate,
  useRevokeCertificate,
  useConfirmCertificate,
} from '@/hooks/use-certificate';
import { useAuthStore } from '@/store/auth.store';
import { useMyProfile } from '@/hooks/use-profile';
import { formatDate } from '@/lib/format';
import type { Certificate } from '@/types/certificate';

const PAGE_SIZE = 12;

type FilterTab = 'all' | 'pending' | 'issued' | 'revoked';

// ─── Certificate Card ──────────────────────────────────────────────────────────
function CertificateCard({
  cert,
  onRevoke,
  onConfirm,
  isAdmin,
  displayName,
  confirmPending,
}: {
  cert: Certificate;
  onRevoke: (id: string) => void;
  onConfirm: (id: string) => void;
  isAdmin: boolean;
  displayName?: string;
  confirmPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const verifyUrl = `/certificates/verify/${cert.verifyCode}`;
  const isPending = cert.status === 'PENDING';
  const isRevoked = cert.status === 'REVOKED';

  function copyLink() {
    const url = typeof window !== 'undefined' ? `${window.location.origin}${verifyUrl}` : verifyUrl;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const borderColor = isPending
    ? 'border-yellow-300'
    : isRevoked
    ? 'border-red-200 opacity-70'
    : 'border-amber-200';

  const headerColor = isPending
    ? 'bg-gradient-to-r from-yellow-300 to-amber-300'
    : isRevoked
    ? 'bg-red-400'
    : 'bg-gradient-to-r from-amber-400 to-yellow-500';

  return (
    <div className={`relative bg-white border-2 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${borderColor}`}>
      <div className={`h-2 ${headerColor}`} />

      {/* PENDING анхааруулга */}
      {isPending && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-start gap-2">
          <span className="text-yellow-500 text-base mt-0.5">⚠️</span>
          <div>
            <p className="text-xs font-semibold text-yellow-800">Таны баталгаажуулалтыг хүлээж байна</p>
            <p className="text-[11px] text-yellow-700 mt-0.5">
              Доорх мэдээллийг шалгаад зөв бол баталгаажуулна уу. Баталгаажсаны дараа өөрчлөгдөхгүй.
            </p>
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Status badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isPending
              ? 'bg-yellow-100 text-yellow-700'
              : cert.status === 'ISSUED'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          }`}>
            {isPending ? 'Хүлээгдэж байна' : cert.status === 'ISSUED' ? 'Олгогдсон' : 'Цуцлагдсан'}
          </span>
          {!isRevoked && <span className="text-2xl">{isPending ? '📋' : '🏆'}</span>}
        </div>

        {/* Гэрчилгээний мэдээлэл */}
        <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{cert.title}</h3>
        <p className="text-sm text-gray-600 font-medium mb-1">{displayName || cert.recipientName}</p>
        {cert.description && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-2">{cert.description}</p>
        )}

        <div className="border-t pt-3 mt-3 space-y-1 text-xs text-gray-500">
          <p>Олгосон: <span className="font-medium text-gray-700">{cert.issuerName}</span></p>
          <p>Дуусгасан: <span className="font-medium text-gray-700">{formatDate(cert.completedAt)}</span></p>
          {!isPending && (
            <p>Олгосон огноо: <span className="font-medium text-gray-700">{formatDate(cert.issuedAt)}</span></p>
          )}
          {cert.expiresAt && (
            <p>Дуусах огноо: <span className="font-medium text-gray-700">{formatDate(cert.expiresAt)}</span></p>
          )}
        </div>

        {/* QR код */}
        {cert.qrCodeUrl && expanded && (
          <div className="mt-3 flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cert.qrCodeUrl}
              alt="Certificate QR Code"
              className="w-24 h-24 border rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <p className="text-[10px] text-gray-400 text-center break-all">{cert.verifyCode}</p>
          </div>
        )}

        {/* PENDING: баталгаажуулах товч */}
        {isPending && !isAdmin && (
          <button
            onClick={() => onConfirm(cert.id)}
            disabled={confirmPending}
            className="w-full mt-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {confirmPending ? 'Баталгаажуулж байна...' : '✓ Мэдээлэл зөв байна — Баталгаажуулах'}
          </button>
        )}

        {/* ISSUED: үйлдлүүд */}
        {!isPending && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <a
              href={verifyUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              🔍 Нийтийн шалгалт
            </a>
            <button
              onClick={copyLink}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              {copied ? '✓ Хуулагдлаа' : '🔗 Холбоос хуулах'}
            </button>
            {cert.qrCodeUrl && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {expanded ? '▲ QR нуух' : '▼ QR харах'}
              </button>
            )}
            <button
              onClick={() => {
                const win = window.open('', '_blank');
                if (win) {
                  win.document.write(buildPrintHtml(cert, displayName));
                  win.document.close();
                  win.print();
                }
              }}
              className="text-xs text-green-600 hover:underline ml-auto"
            >
              🖨️ Хэвлэх
            </button>
            {isAdmin && cert.status === 'ISSUED' && (
              <button
                onClick={() => onRevoke(cert.id)}
                className="text-xs text-red-500 hover:underline"
              >
                Цуцлах
              </button>
            )}
          </div>
        )}

        {/* Admin-ийн PENDING удирдлага */}
        {isPending && isAdmin && (
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-gray-400 italic">Сурагч баталгаажуулахыг хүлээж байна</span>
            <button
              onClick={() => onRevoke(cert.id)}
              className="text-xs text-red-500 hover:underline ml-auto"
            >
              Цуцлах
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Print template ────────────────────────────────────────────────────────────
function buildPrintHtml(cert: Certificate, displayName?: string): string {
  const name = displayName || cert.recipientName;
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('mn-MN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const verifyOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  return `<!DOCTYPE html><html lang="mn"><head><title>${cert.title}</title>
<style>
  body { font-family: Georgia, serif; margin: 0; padding: 40px; background: #fffbf0; }
  .cert { border: 8px double #c8a84b; padding: 40px; max-width: 700px; margin: auto; text-align: center; background: white; }
  .title { font-size: 30px; color: #7a5c00; margin: 20px 0 8px; }
  .subtitle { font-size: 13px; color: #888; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 30px; }
  .name { font-size: 26px; font-weight: bold; color: #222; border-bottom: 2px solid #c8a84b; display: inline-block; padding-bottom: 4px; margin: 10px 0; }
  .desc { font-size: 15px; color: #555; margin: 16px 0; }
  .meta { font-size: 12px; color: #999; margin-top: 30px; }
  .seal { font-size: 48px; margin: 20px 0; }
  .verify { font-size: 10px; color: #bbb; margin-top: 20px; }
</style></head><body>
<div class="cert">
  <div class="seal">🏆</div>
  <div class="subtitle">Дүүргэсний гэрчилгээ</div>
  <div class="title">${cert.title}</div>
  <p style="color:#666;font-size:15px">Гэрчилгээ олгох нь:</p>
  <div class="name">${name}</div>
  ${cert.description ? `<div class="desc"><strong>${cert.description}</strong> сургалтыг амжилттай дүүргэсэн болохыг гэрчилнэ</div>` : ''}
  <div class="meta">
    <p>Олгосон: <strong>${cert.issuerName}</strong> · ${issuedDate}</p>
    ${cert.expiresAt ? `<p>Хүртэл хүчинтэй: ${new Date(cert.expiresAt).toLocaleDateString('mn-MN')}</p>` : ''}
  </div>
  <div class="verify">Шалгах холбоос: ${verifyOrigin}/certificates/verify/${cert.verifyCode}</div>
</div>
</body></html>`;
}

// ─── Issue Modal ───────────────────────────────────────────────────────────────
function IssueModal({ onClose }: { onClose: () => void }) {
  const issue = useIssueCertificate();
  const [form, setForm] = useState({
    userId: '',
    title: 'Сургалт дүүргэсний гэрчилгээ',
    recipientName: '',
    courseId: '',
    description: '',
    completedAt: new Date().toISOString().slice(0, 10),
  });
  const [done, setDone] = useState(false);

  function handleChange(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await issue.mutateAsync({
      userId: form.userId,
      title: form.title,
      recipientName: form.recipientName,
      courseId: form.courseId || undefined,
      description: form.description || undefined,
      completedAt: new Date(form.completedAt).toISOString(),
    });
    setDone(true);
  }

  const fields = [
    { key: 'userId', label: 'Хэрэглэгчийн ID', type: 'text', required: true, placeholder: 'UUID' },
    { key: 'recipientName', label: 'Хүлээн авагчийн нэр', type: 'text', required: true, placeholder: 'Бат-Эрдэнэ Дорж' },
    { key: 'title', label: 'Гэрчилгээний нэр', type: 'text', required: true, placeholder: '' },
    { key: 'description', label: 'Сургалтын нэр (заавал биш)', type: 'text', required: false, placeholder: '' },
    { key: 'courseId', label: 'Сургалтын ID (заавал биш)', type: 'text', required: false, placeholder: 'UUID' },
    { key: 'completedAt', label: 'Дүүргэсэн огноо', type: 'date', required: true, placeholder: '' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Гэрчилгээ олгох</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        {done ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">🏆</p>
            <p className="text-green-600 font-semibold">Гэрчилгээ амжилттай олгогдлоо!</p>
            <p className="text-sm text-gray-500 mt-1">Сурагч баталгаажуулахыг хүлээж байна.</p>
            <button onClick={onClose} className="mt-4 text-sm text-blue-600 hover:underline">Хаах</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {fields.map(({ key, label, type, required, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={e => handleChange(key, e.target.value)}
                  required={required}
                  placeholder={placeholder}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            ))}
            {issue.error && (
              <p className="text-xs text-red-500">{issue.error.message}</p>
            )}
            <p className="text-[11px] text-gray-400">
              Admin-аас олгосон гэрчилгээ шууд <strong>ISSUED</strong> болно.
            </p>
            <button
              type="submit"
              disabled={issue.isPending}
              className="w-full bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium text-sm"
            >
              {issue.isPending ? 'Олгож байна...' : 'Гэрчилгээ олгох'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CertificatesPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [showIssue, setShowIssue] = useState(false);

  const { user } = useAuthStore();
  const { data: profile } = useMyProfile();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const currentDisplayName = isAdmin ? undefined : (profile?.displayName || undefined);

  // includeRevoked=true: бүх статусыг авна, дараа нь client-д filter хийнэ
  const { data, isLoading } = useCertificates({
    search: search || undefined,
    limit: PAGE_SIZE,
    offset,
    includeRevoked: true,
  });

  const revoke = useRevokeCertificate();
  const confirmMutation = useConfirmCertificate();

  const allCerts = data?.items ?? [];

  // Client-side filter tabs
  const filteredCerts = allCerts.filter(c => {
    if (activeTab === 'pending') return c.status === 'PENDING';
    if (activeTab === 'issued') return c.status === 'ISSUED';
    if (activeTab === 'revoked') return c.status === 'REVOKED';
    return true;
  });

  const pendingCount = allCerts.filter(c => c.status === 'PENDING').length;
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  async function handleRevoke(id: string) {
    if (!window.confirm('Энэ гэрчилгээг цуцлах уу? Буцаах боломжгүй.')) return;
    await revoke.mutateAsync(id);
  }

  async function handleConfirm(id: string) {
    if (!window.confirm('Мэдээлэл зөв байна уу? Баталгаажсаны дараа өөрчлөх боломжгүй болно.')) return;
    await confirmMutation.mutateAsync(id);
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Бүгд' },
    { key: 'pending', label: 'Хүлээгдэж байна' },
    { key: 'issued', label: 'Олгогдсон' },
    { key: 'revoked', label: 'Цуцлагдсан' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🏆 {isAdmin ? 'Гэрчилгээний удирдлага' : 'Миний гэрчилгээнүүд'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {total} гэрчилгээ
              {pendingCount > 0 && !isAdmin && (
                <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {pendingCount} баталгаажуулах шаардлагатай
                </span>
              )}
            </p>
          </div>
          {(isAdmin || user?.role === 'INSTRUCTOR') && (
            <button
              onClick={() => setShowIssue(true)}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 text-sm font-medium"
            >
              + Гэрчилгээ олгох
            </button>
          )}
        </div>

        {/* Pending notification banner for students */}
        {!isAdmin && pendingCount > 0 && (
          <div className="mb-5 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-semibold text-yellow-800 text-sm">
                {pendingCount} гэрчилгээ таны баталгаажуулалтыг хүлээж байна
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Гэрчилгээн дэх мэдээллийг (нэр, сургалт, огноо) шалгаад зөв бол баталгаажуулна уу.
                Баталгаажсаны дараа гэрчилгээ татах, хуваалцах боломжтой болно.
              </p>
            </div>
          </div>
        )}

        {/* Search + Filter tabs */}
        <div className="mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <input
            type="search"
            value={search}
            onChange={e => { setSearch(e.target.value); setOffset(0); }}
            placeholder="Гэрчилгээ хайх..."
            className="border rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          />
          <div className="flex gap-1 flex-wrap">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-600 border hover:bg-amber-50'
                }`}
              >
                {tab.label}
                {tab.key === 'pending' && pendingCount > 0 && (
                  <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'pending' ? 'bg-white text-amber-600' : 'bg-yellow-400 text-white'
                  }`}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-2 border-amber-100 rounded-2xl bg-white overflow-hidden animate-pulse">
                <div className="h-2 bg-amber-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-5 bg-gray-200 rounded w-4/5" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-16 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCerts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">🎓</p>
            <p className="text-gray-500 text-lg">
              {activeTab === 'pending' ? 'Хүлээгдэж буй гэрчилгээ байхгүй' :
               activeTab === 'issued' ? 'Олгогдсон гэрчилгээ байхгүй' :
               activeTab === 'revoked' ? 'Цуцлагдсан гэрчилгээ байхгүй' :
               'Гэрчилгээ байхгүй байна'}
            </p>
            {activeTab === 'all' && (
              <p className="text-sm text-gray-400 mt-1">Сургалт дуусгаж анхны гэрчилгээгээ авна уу</p>
            )}
            {(search || activeTab !== 'all') && (
              <button
                onClick={() => { setSearch(''); setActiveTab('all'); }}
                className="mt-3 text-sm text-amber-600 hover:underline"
              >
                Шүүлтүүр цэвэрлэх
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCerts.map(cert => (
              <CertificateCard
                key={cert.id}
                cert={cert}
                onRevoke={handleRevoke}
                onConfirm={handleConfirm}
                isAdmin={isAdmin}
                displayName={currentDisplayName}
                confirmPending={confirmMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
              disabled={offset === 0}
              className="px-3 py-1.5 border rounded-lg text-sm hover:bg-white disabled:opacity-40"
            >
              ← Өмнөх
            </button>
            <span className="text-sm text-gray-600">{currentPage} / {totalPages} хуудас</span>
            <button
              onClick={() => setOffset(o => o + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              className="px-3 py-1.5 border rounded-lg text-sm hover:bg-white disabled:opacity-40"
            >
              Дараах →
            </button>
          </div>
        )}
      </div>

      {showIssue && <IssueModal onClose={() => setShowIssue(false)} />}
    </div>
  );
}
