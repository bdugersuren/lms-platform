'use client';

import { useState } from 'react';
import { useCertificates, useIssueCertificate, useRevokeCertificate } from '@/hooks/use-certificate';
import { useAuthStore } from '@/store/auth.store';
import type { Certificate } from '@/types/certificate';

const PAGE_SIZE = 12;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ─── Certificate Card ──────────────────────────────────────────────────────────
function CertificateCard({
  cert,
  onRevoke,
  isAdmin,
}: {
  cert: Certificate;
  onRevoke: (id: string) => void;
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const verifyUrl = `/certificates/verify/${cert.verifyCode}`;

  return (
    <div className={`relative bg-white border-2 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
      cert.status === 'REVOKED' ? 'border-red-200 opacity-70' : 'border-amber-200'
    }`}>
      {/* Gold header bar */}
      <div className={`h-2 ${cert.status === 'REVOKED' ? 'bg-red-400' : 'bg-gradient-to-r from-amber-400 to-yellow-500'}`} />

      <div className="p-5">
        {/* Status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            cert.status === 'ISSUED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {cert.status}
          </span>
          {cert.status === 'ISSUED' && (
            <span className="text-2xl">🏆</span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{cert.title}</h3>
        <p className="text-sm text-gray-600 font-medium mb-1">{cert.recipientName}</p>
        {cert.description && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-2">{cert.description}</p>
        )}

        <div className="border-t pt-3 mt-3 space-y-1 text-xs text-gray-500">
          <p>Issued by: <span className="font-medium text-gray-700">{cert.issuerName}</span></p>
          <p>Completed: <span className="font-medium text-gray-700">{formatDate(cert.completedAt)}</span></p>
          <p>Issued: <span className="font-medium text-gray-700">{formatDate(cert.issuedAt)}</span></p>
          {cert.expiresAt && (
            <p>Expires: <span className="font-medium text-gray-700">{formatDate(cert.expiresAt)}</span></p>
          )}
        </div>

        {/* QR Code */}
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

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <a
            href={verifyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            🔗 Verify
          </a>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {expanded ? '▲ Hide QR' : '▼ Show QR'}
          </button>
          <button
            onClick={() => {
              const win = window.open('', '_blank');
              if (win) {
                win.document.write(buildPrintHtml(cert));
                win.document.close();
                win.print();
              }
            }}
            className="text-xs text-green-600 hover:underline ml-auto"
          >
            🖨️ Print
          </button>
          {isAdmin && cert.status === 'ISSUED' && (
            <button
              onClick={() => onRevoke(cert.id)}
              className="text-xs text-red-500 hover:underline"
            >
              Revoke
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function buildPrintHtml(cert: Certificate): string {
  return `<!DOCTYPE html><html><head><title>${cert.title}</title>
<style>
  body { font-family: Georgia, serif; margin: 0; padding: 40px; background: #fffbf0; }
  .cert { border: 8px double #c8a84b; padding: 40px; max-width: 700px; margin: auto; text-align: center; background: white; }
  .title { font-size: 32px; color: #7a5c00; margin: 20px 0 8px; }
  .subtitle { font-size: 14px; color: #888; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 30px; }
  .name { font-size: 26px; font-weight: bold; color: #222; border-bottom: 2px solid #c8a84b; display: inline-block; padding-bottom: 4px; margin: 10px 0; }
  .desc { font-size: 16px; color: #555; margin: 16px 0; }
  .meta { font-size: 12px; color: #999; margin-top: 30px; }
  .seal { font-size: 48px; margin: 20px 0; }
  .verify { font-size: 10px; color: #bbb; margin-top: 20px; }
</style></head><body>
<div class="cert">
  <div class="seal">🏆</div>
  <div class="subtitle">Certificate of Achievement</div>
  <div class="title">${cert.title}</div>
  <p style="color:#666;font-size:15px">This is to certify that</p>
  <div class="name">${cert.recipientName}</div>
  ${cert.description ? `<div class="desc">has successfully completed <strong>${cert.description}</strong></div>` : ''}
  <div class="meta">
    <p>Issued by <strong>${cert.issuerName}</strong> on ${new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    ${cert.expiresAt ? `<p>Valid until ${new Date(cert.expiresAt).toLocaleDateString()}</p>` : ''}
  </div>
  <div class="verify">Verify at: ${typeof window !== 'undefined' ? window.location.origin : ''}/certificates/verify/${cert.verifyCode}</div>
</div>
</body></html>`;
}

// ─── Issue Modal ───────────────────────────────────────────────────────────────
function IssueModal({ onClose }: { onClose: () => void }) {
  const issue = useIssueCertificate();
  const [form, setForm] = useState({
    userId: '', title: 'Certificate of Completion', recipientName: '',
    courseId: '', description: '', completedAt: new Date().toISOString().slice(0, 10),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Issue Certificate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        {done ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">🏆</p>
            <p className="text-green-600 font-semibold">Certificate issued successfully!</p>
            <p className="text-sm text-gray-500 mt-1">QR code will be generated in the background.</p>
            <button onClick={onClose} className="mt-4 text-sm text-blue-600 hover:underline">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {[
              { key: 'userId', label: 'User ID', type: 'text', required: true },
              { key: 'title', label: 'Certificate Title', type: 'text', required: true },
              { key: 'recipientName', label: 'Recipient Name', type: 'text', required: true },
              { key: 'description', label: 'Course / Achievement (optional)', type: 'text', required: false },
              { key: 'courseId', label: 'Course ID (optional)', type: 'text', required: false },
              { key: 'completedAt', label: 'Completion Date', type: 'date', required: true },
            ].map(({ key, label, type, required }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={e => handleChange(key, e.target.value)}
                  required={required}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            ))}
            {issue.error && (
              <p className="text-xs text-red-500">{issue.error.message}</p>
            )}
            <button
              type="submit"
              disabled={issue.isPending}
              className="w-full bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium text-sm"
            >
              {issue.isPending ? 'Issuing…' : 'Issue Certificate'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CertificatesPage() {
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [showIssue, setShowIssue] = useState(false);

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const { data, isLoading } = useCertificates({ search: search || undefined, limit: PAGE_SIZE, offset });
  const revoke = useRevokeCertificate();

  const certs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this certificate? This cannot be undone.')) return;
    await revoke.mutateAsync(id);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🏆 My Certificates
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} certificate{total !== 1 ? 's' : ''} earned</p>
          </div>
          {(isAdmin || user?.role === 'INSTRUCTOR') && (
            <button
              onClick={() => setShowIssue(true)}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 text-sm font-medium"
            >
              + Issue Certificate
            </button>
          )}
        </div>

        {/* Search */}
        <div className="mb-5">
          <input
            type="search"
            value={search}
            onChange={e => { setSearch(e.target.value); setOffset(0); }}
            placeholder="Search certificates…"
            className="border rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          />
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
        ) : certs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">🎓</p>
            <p className="text-gray-500 text-lg">No certificates yet</p>
            <p className="text-sm text-gray-400 mt-1">Complete courses to earn your first certificate</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-3 text-sm text-amber-600 hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {certs.map(cert => (
              <CertificateCard
                key={cert.id}
                cert={cert}
                onRevoke={handleRevoke}
                isAdmin={isAdmin}
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
              ← Prev
            </button>
            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setOffset(o => o + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              className="px-3 py-1.5 border rounded-lg text-sm hover:bg-white disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {showIssue && <IssueModal onClose={() => setShowIssue(false)} />}
    </div>
  );
}
