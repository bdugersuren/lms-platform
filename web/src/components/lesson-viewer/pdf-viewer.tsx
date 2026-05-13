'use client';

import { useState } from 'react';
import type { InteractiveBlock } from '@/types/course';
import { useMediaUrl } from '@/hooks/use-media-url';
import { BlockQuiz } from './block-quiz';

interface PdfViewerProps {
  url: string;
  blocks: InteractiveBlock[];
}

export function PdfViewer({ url, blocks }: PdfViewerProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const { mediaUrl, loading: mediaLoading } = useMediaUrl(url);

  const pageBlocks = blocks
    .filter((b) => b.triggerPage != null)
    .sort((a, b) => (a.triggerPage ?? 0) - (b.triggerPage ?? 0));

  const otherBlocks = blocks.filter(
    (b) => b.triggerPage == null && b.triggerSecond == null && b.triggerParagraph == null,
  );

  const handleComplete = (id: string) => (passed: boolean) => {
    setCompletedIds((prev) => { const next = new Set(prev); next.add(id); return next; });
  };

  return (
    <div className="space-y-6">
      {/* PDF embed */}
      <div
        className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
        onContextMenu={(e) => e.preventDefault()}
      >
        {mediaLoading ? (
          <div className="flex items-center justify-center h-[680px] bg-slate-50">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <object
            data={mediaUrl ?? ''}
            type="application/pdf"
            className="w-full h-[680px]"
          >
            <div className="flex flex-col items-center justify-center h-64 bg-slate-50 text-slate-400">
              <span className="text-4xl mb-3">📄</span>
              <p className="text-sm mb-3">Браузер PDF харуулахгүй байна</p>
              <p className="text-xs text-slate-400">Хуудсыг дахин ачаална уу</p>
            </div>
          </object>
        )}
      </div>

      {/* Page-triggered blocks */}
      {pageBlocks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Хуудасны даалгаварууд
          </h3>
          {pageBlocks.map((block) => (
            <div key={block.id} className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  📄 Хуудас {block.triggerPage} дараа
                </span>
                {completedIds.has(block.id) && (
                  <span className="text-xs text-emerald-600 font-medium">✓ Дууссан</span>
                )}
              </div>
              <div className="p-4">
                <BlockQuiz
                  block={block}
                  onComplete={handleComplete(block.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Other blocks */}
      {otherBlocks.length > 0 && (
        <div className="space-y-4">
          {otherBlocks.map((block) => (
            <BlockQuiz key={block.id} block={block} onComplete={handleComplete(block.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
