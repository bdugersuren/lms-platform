'use client';

import { useState, useRef, useCallback } from 'react';
import {
  useMediaLibrary,
  useDeleteMedia,
  useMediaUpload,
  useQueueTranscode,
  useSubtitles,
  useDeleteSubtitle,
} from '@/hooks/use-media-library';
import type { MediaFile, MediaType, TranscodeFormat } from '@/types/media';

const TYPE_TABS: { label: string; value: MediaType | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Video', value: 'VIDEO' },
  { label: 'Audio', value: 'AUDIO' },
  { label: 'Image', value: 'IMAGE' },
  { label: 'PDF', value: 'PDF' },
  { label: 'Document', value: 'DOCUMENT' },
];

const TRANSCODE_FORMATS: TranscodeFormat[] = ['MP4_480P', 'MP4_720P', 'MP4_1080P', 'HLS', 'WEBM'];

const PAGE_SIZE = 20;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(seconds?: number) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function typeIcon(type: MediaType) {
  switch (type) {
    case 'VIDEO': return '🎬';
    case 'AUDIO': return '🎵';
    case 'IMAGE': return '🖼️';
    case 'PDF': return '📄';
    case 'DOCUMENT': return '📝';
    default: return '📁';
  }
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    READY: 'bg-green-100 text-green-800',
    UPLOADING: 'bg-blue-100 text-blue-800',
    TRANSCODING: 'bg-yellow-100 text-yellow-800',
    FAILED: 'bg-red-100 text-red-800',
    DELETED: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// ─── Subtitle Panel ───────────────────────────────────────────────────────────
function SubtitlePanel({ mediaFile, onClose }: { mediaFile: MediaFile; onClose: () => void }) {
  const { data: subtitles = [], isLoading } = useSubtitles(mediaFile.id);
  const deleteSubtitle = useDeleteSubtitle();
  const [lang, setLang] = useState('en');
  const [label, setLabel] = useState('English');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
      const token = typeof window !== 'undefined'
        ? (await import('@/store/auth.store')).useAuthStore.getState().accessToken
        : null;
      const qs = new URLSearchParams({ language: lang, label });
      const res = await fetch(`${apiBase}/media/files/${mediaFile.id}/subtitles?${qs}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message ?? 'Upload failed');
      }
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Subtitles — {mediaFile.originalName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Upload new subtitle */}
        <div className="border rounded-lg p-4 mb-4 space-y-3 bg-gray-50">
          <p className="text-sm font-medium text-gray-700">Add subtitle</p>
          <div className="flex gap-2">
            <input
              value={lang}
              onChange={e => setLang(e.target.value)}
              placeholder="Lang code (en)"
              className="border rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Label (English)"
              className="border rounded px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <input ref={fileRef} type="file" accept=".vtt,.srt,.txt" className="text-sm" />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : subtitles.length === 0 ? (
          <p className="text-sm text-gray-400">No subtitles yet.</p>
        ) : (
          <ul className="space-y-2">
            {subtitles.map(sub => (
              <li key={sub.id} className="flex items-center justify-between text-sm border rounded-lg px-3 py-2">
                <div>
                  <span className="font-medium">{sub.label}</span>
                  <span className="text-gray-400 ml-2">({sub.language})</span>
                  <span className="text-gray-400 ml-2 uppercase text-xs">{sub.format}</span>
                </div>
                <div className="flex gap-2">
                  <a href={sub.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">
                    View
                  </a>
                  <button
                    onClick={() => deleteSubtitle.mutate({ mediaFileId: mediaFile.id, subtitleId: sub.id })}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Transcode Modal ──────────────────────────────────────────────────────────
function TranscodeModal({ mediaFile, onClose }: { mediaFile: MediaFile; onClose: () => void }) {
  const queueTranscode = useQueueTranscode();
  const [selected, setSelected] = useState<TranscodeFormat>('MP4_720P');
  const [done, setDone] = useState(false);

  async function handleQueue() {
    await queueTranscode.mutateAsync({ mediaFileId: mediaFile.id, format: selected });
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Queue Transcode</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {done ? (
          <div className="text-center py-4">
            <p className="text-green-600 font-medium">Transcode job queued!</p>
            <p className="text-sm text-gray-500 mt-1">The job will process in the background.</p>
            <button onClick={onClose} className="mt-4 text-sm text-blue-600 hover:underline">Close</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-3">Select output format for <span className="font-medium">{mediaFile.originalName}</span>:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {TRANSCODE_FORMATS.map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setSelected(fmt)}
                  className={`text-sm border rounded-lg px-3 py-2 text-left transition-colors ${
                    selected === fmt
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {fmt.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button
              onClick={handleQueue}
              disabled={queueTranscode.isPending}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {queueTranscode.isPending ? 'Queuing…' : 'Queue Job'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Media Card ───────────────────────────────────────────────────────────────
function MediaCard({
  file,
  onDelete,
  onTranscode,
  onSubtitles,
}: {
  file: MediaFile;
  onDelete: (id: string) => void;
  onTranscode: (file: MediaFile) => void;
  onSubtitles: (file: MediaFile) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="border rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative">
      {/* Thumbnail / preview area */}
      <div className="h-36 bg-gray-100 flex items-center justify-center relative overflow-hidden">
        {file.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.thumbnail} alt={file.title ?? file.originalName} className="w-full h-full object-cover" />
        ) : file.mediaType === 'IMAGE' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.url} alt={file.originalName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">{typeIcon(file.mediaType)}</span>
        )}
        {file.duration && (
          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(file.duration)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-800 truncate" title={file.title ?? file.originalName}>
          {file.title ?? file.originalName}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {statusBadge(file.status)}
          <span className="text-xs text-gray-400">{formatBytes(file.size)}</span>
        </div>
      </div>

      {/* Actions menu */}
      <div className="absolute top-2 right-2">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="bg-white/90 hover:bg-white rounded-full w-7 h-7 flex items-center justify-center shadow text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ⋮
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border z-10 w-40 py-1 text-sm"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              <span>🔗</span> Open
            </a>
            {file.mediaType === 'VIDEO' && (
              <button
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 w-full text-left"
                onClick={() => { setMenuOpen(false); onTranscode(file); }}
              >
                <span>⚙️</span> Transcode
              </button>
            )}
            {(file.mediaType === 'VIDEO' || file.mediaType === 'AUDIO') && (
              <button
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 w-full text-left"
                onClick={() => { setMenuOpen(false); onSubtitles(file); }}
              >
                <span>💬</span> Subtitles {file._count?.subtitles ? `(${file._count.subtitles})` : ''}
              </button>
            )}
            <button
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 w-full text-left text-red-500"
              onClick={() => { setMenuOpen(false); onDelete(file.id); }}
            >
              <span>🗑️</span> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Upload Drop Zone ─────────────────────────────────────────────────────────
function UploadZone({ onUploaded }: { onUploaded: () => void }) {
  const { upload, uploading, progress, error, reset } = useMediaUpload();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    reset();
    try {
      await upload(files[0]);
      onUploaded();
    } catch {
      // error shown in UI
    }
  }, [upload, reset, onUploaded]);

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
        dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
      }`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="video/*,audio/*,image/*,.pdf,.doc,.docx"
        onChange={e => void handleFiles(e.target.files)}
      />
      {uploading ? (
        <div className="space-y-2">
          <p className="text-sm text-blue-600 font-medium">Uploading… {progress}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-3xl">☁️</p>
          <p className="text-sm font-medium text-gray-600">Drop a file here or click to browse</p>
          <p className="text-xs text-gray-400">Video, Audio, Image, PDF, Document — up to 500 MB</p>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MediaLibraryPage() {
  const [activeType, setActiveType] = useState<MediaType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [transcodeTarget, setTranscodeTarget] = useState<MediaFile | null>(null);
  const [subtitleTarget, setSubtitleTarget] = useState<MediaFile | null>(null);

  const params = {
    mediaType: activeType !== 'ALL' ? activeType : undefined,
    search: search || undefined,
    limit: PAGE_SIZE,
    offset,
  };

  const { data, isLoading, refetch } = useMediaLibrary(params);
  const deleteMedia = useDeleteMedia();

  const files = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  function handleTypeTab(val: MediaType | 'ALL') {
    setActiveType(val);
    setOffset(0);
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setOffset(0);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this file? This cannot be undone.')) return;
    await deleteMedia.mutateAsync(id);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} file{total !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowUpload(v => !v)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            {showUpload ? '✕ Close' : '+ Upload'}
          </button>
        </div>

        {/* Upload zone */}
        {showUpload && (
          <div className="mb-6">
            <UploadZone onUploaded={() => { void refetch(); setShowUpload(false); }} />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Type tabs */}
          <div className="flex gap-1 bg-white border rounded-lg p-1 flex-wrap">
            {TYPE_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => handleTypeTab(tab.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeType === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="search"
            value={search}
            onChange={handleSearch}
            placeholder="Search files…"
            className="border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="border rounded-xl bg-white overflow-hidden shadow-sm animate-pulse">
                <div className="h-36 bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-gray-500">No files found</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-sm text-blue-600 hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map(file => (
              <MediaCard
                key={file.id}
                file={file}
                onDelete={handleDelete}
                onTranscode={setTranscodeTarget}
                onSubtitles={setSubtitleTarget}
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
              className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setOffset(o => o + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {transcodeTarget && (
        <TranscodeModal mediaFile={transcodeTarget} onClose={() => setTranscodeTarget(null)} />
      )}
      {subtitleTarget && (
        <SubtitlePanel mediaFile={subtitleTarget} onClose={() => setSubtitleTarget(null)} />
      )}
    </div>
  );
}
