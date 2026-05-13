'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { InteractiveBlock } from '@/types/course';
import { useMediaUrl } from '@/hooks/use-media-url';
import { BlockQuiz } from './block-quiz';

interface VideoPlayerProps {
  url: string;
  blocks: InteractiveBlock[];
}

// ─── URL detection helpers ────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  // Handles: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

type VideoSource =
  | { type: 'youtube'; embedUrl: string }
  | { type: 'vimeo'; embedUrl: string }
  | { type: 'native'; url: string };

function resolveSource(url: string): VideoSource {
  const ytId = getYouTubeId(url);
  if (ytId) {
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1` };
  }
  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoId}` };
  }
  return { type: 'native', url };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VideoPlayer({ url, blocks }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [activeBlock, setActiveBlock] = useState<InteractiveBlock | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState(false);

  const source = resolveSource(url);
  const isEmbed = source.type === 'youtube' || source.type === 'vimeo';

  // Presigned URL — only for native (non-embed) sources
  const { mediaUrl, loading: mediaLoading } = useMediaUrl(isEmbed ? null : url);

  const triggerBlocks = blocks
    .filter((b) => b.triggerSecond != null)
    .sort((a, b) => (a.triggerSecond ?? 0) - (b.triggerSecond ?? 0));

  const noTriggerBlocks = blocks.filter(
    (b) => b.triggerSecond == null && b.triggerPage == null && b.triggerParagraph == null,
  );

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || activeBlock) return;
    const t = video.currentTime;

    const triggered = triggerBlocks.find(
      (b) => b.triggerSecond != null && t >= b.triggerSecond && !completedIds.has(b.id),
    );
    if (triggered) {
      video.pause();
      setActiveBlock(triggered);
    }
  }, [activeBlock, completedIds, triggerBlocks]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [handleTimeUpdate]);

  const handleBlockComplete = (passed: boolean) => {
    if (!activeBlock) return;
    const block = activeBlock;
    setCompletedIds((prev) => { const next = new Set(prev); next.add(block.id); return next; });
    setActiveBlock(null);
    if (!block.continueOnPassOnly || passed) {
      videoRef.current?.play();
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Video container */}
      <div
        className="relative bg-black rounded-2xl overflow-hidden shadow-lg"
        onContextMenu={(e) => e.preventDefault()}
      >

        {/* ── Embedded player (YouTube / Vimeo) ── */}
        {isEmbed && (
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <iframe
              src={(source as { type: 'youtube' | 'vimeo'; embedUrl: string }).embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              title="Video player"
            />
          </div>
        )}

        {/* ── Native video player ── */}
        {!isEmbed && (
          <>
            {mediaLoading ? (
              <div className="flex items-center justify-center h-64 bg-black">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <span className="text-4xl mb-3">⚠️</span>
                <p className="text-sm">Видео ачаалагдсангүй</p>
                <p className="text-xs text-slate-500 mt-2">Хуудсыг дахин ачаална уу</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                src={mediaUrl ?? ''}
                className="w-full max-h-[540px]"
                controls
                controlsList="nodownload disablePictureInPicture"
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onError={() => setError(true)}
              />
            )}

            {/* Block marker dots on the native timeline */}
            {duration > 0 && triggerBlocks.length > 0 && (
              <div className="absolute bottom-12 left-0 right-0 px-3 pointer-events-none">
                <div className="relative h-0">
                  {triggerBlocks.map((b) => (
                    <div
                      key={b.id}
                      className="absolute -top-3"
                      style={{ left: `${((b.triggerSecond ?? 0) / duration) * 100}%` }}
                      title={`${b.title ?? 'Тест'} — ${fmt(b.triggerSecond ?? 0)}`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full border-2 border-white shadow ${
                          completedIds.has(b.id) ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Block overlay on top of paused video */}
            {activeBlock && (
              <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
                <div className="w-full max-w-2xl">
                  <BlockQuiz block={activeBlock} onComplete={handleBlockComplete} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* YouTube/Vimeo notice: time-based triggers not available */}
      {isEmbed && triggerBlocks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          ℹ️ Гадаад видео тул цаг-тохируулгатай блокууд автомат ажиллахгүй. Доороос гараар хариулна уу.
        </div>
      )}

      {/* Block markers legend (native only) */}
      {!isEmbed && triggerBlocks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {triggerBlocks.map((b) => (
            <span
              key={b.id}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                completedIds.has(b.id)
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {completedIds.has(b.id) ? '✓ ' : ''}
              {fmt(b.triggerSecond ?? 0)} · {b.title ?? 'Тест'}
            </span>
          ))}
        </div>
      )}

      {/* Time-triggered blocks shown below for embedded players */}
      {isEmbed && triggerBlocks.length > 0 && (
        <div className="space-y-4">
          {triggerBlocks.map((b) => (
            <div key={b.id} className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">⏱ {fmt(b.triggerSecond ?? 0)} дараа</span>
                {completedIds.has(b.id) && (
                  <span className="text-xs text-emerald-600 font-medium">✓ Дууссан</span>
                )}
              </div>
              <div className="p-4">
                <BlockQuiz
                  block={b}
                  onComplete={(passed) => {
                    setCompletedIds((prev) => { const next = new Set(prev); next.add(b.id); return next; });
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Non-triggered blocks shown below video */}
      {noTriggerBlocks.length > 0 && (
        <div className="space-y-4 pt-2">
          {noTriggerBlocks.map((block) => (
            <BlockQuiz key={block.id} block={block} onComplete={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
