'use client';

import { useRef, useState, DragEvent } from 'react';
import { useUpload } from '@/hooks/use-upload';
import { clsx } from 'clsx';

type AcceptType = 'video' | 'pdf' | 'image' | 'audio';

const ACCEPT_MAP: Record<AcceptType, { mime: string; label: string; ext: string }> = {
  video: { mime: 'video/*', label: 'MP4, WebM', ext: '.mp4,.webm,.ogg' },
  pdf: { mime: 'application/pdf', label: 'PDF', ext: '.pdf' },
  image: { mime: 'image/*', label: 'JPEG, PNG, WebP', ext: '.jpg,.jpeg,.png,.webp,.gif' },
  audio: { mime: 'audio/*', label: 'MP3, OGG, WAV', ext: '.mp3,.ogg,.wav' },
};

interface FileUploadProps {
  accept: AcceptType;
  value: string;
  onChange: (url: string) => void;
  label?: string;
  maxMb?: number;
}

export function FileUpload({ accept, value, onChange, label, maxMb = 500 }: FileUploadProps) {
  const { upload, uploading, progress, error, reset } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const config = ACCEPT_MAP[accept];

  const handleFile = async (file: File) => {
    if (file.size > maxMb * 1024 * 1024) {
      alert(`Файлын хэмжээ ${maxMb}MB-аас хэтрэхгүй байна уу`);
      return;
    }
    try {
      const result = await upload(file);
      onChange(result.url);
    } catch (_e) {
      // error shown via state
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const applyUrl = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-slate-700">{label}</p>}

      {/* Drop zone */}
      <div
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
          dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50',
          uploading && 'pointer-events-none opacity-60',
        )}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={config.ext}
          className="hidden"
          onChange={handleInput}
        />
        <div className="text-3xl mb-2">
          {accept === 'video' ? '🎬' : accept === 'pdf' ? '📄' : accept === 'image' ? '🖼️' : '🎵'}
        </div>
        <p className="text-sm font-medium text-slate-700">
          {uploading ? 'Байршуулж байна...' : 'Файл чирж оруулах эсвэл дарж сонгох'}
        </p>
        <p className="text-xs text-slate-400 mt-1">{config.label} • Дээд хэмжээ {maxMb}MB</p>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-1">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-indigo-500 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 text-right">{progress}%</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          &#9888; {error}
          <button onClick={reset} className="underline ml-1">Дахин оролдох</button>
        </p>
      )}

      {/* Current value */}
      {value && !uploading && (
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
          <span className="text-xs text-slate-500 flex-1 truncate">{value}</span>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(value)}
            className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
          >
            Хуулах
          </button>
          <button
            type="button"
            onClick={() => { onChange(''); reset(); }}
            className="text-xs text-red-400 hover:text-red-600 ml-1"
          >
            &#215;
          </button>
        </div>
      )}

      {/* Manual URL input toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowUrlInput(v => !v)}
          className="text-xs text-slate-400 hover:text-slate-600 underline"
        >
          {showUrlInput ? 'Болих' : 'URL-аар оруулах'}
        </button>
        {showUrlInput && (
          <div className="flex gap-2 mt-2">
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyUrl()}
              placeholder="https://..."
              className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={applyUrl}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
