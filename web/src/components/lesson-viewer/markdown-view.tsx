'use client';

import { useMemo, useState } from 'react';
import type { InteractiveBlock } from '@/types/course';
import { BlockQuiz } from './block-quiz';

// ─── Inline renderer ──────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-2 inline-block" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-600 hover:underline" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[0.85em] font-mono">$1</code>');
}

// ─── Segment parser ───────────────────────────────────────────────────────────
// Each "segment" is one top-level block element.
// Consecutive non-blank text lines are merged into one <p> (= one segment).
// Segment index (0-based) + 1 = paragraph number used by triggerParagraph.

function parseSegments(md: string): string[] {
  const lines = md.split('\n');
  const segments: string[] = [];

  let inCodeBlock = false;
  let codeLines: string[] = [];
  let listTag = '';
  let listItems: string[] = [];
  let bqLines: string[] = [];
  let paraLines: string[] = [];

  const flushPara = () => {
    if (paraLines.length === 0) return;
    segments.push(
      `<p class="mb-4 text-slate-700 leading-relaxed">${paraLines.join('<br />')}</p>`,
    );
    paraLines = [];
  };
  const flushList = () => {
    if (listItems.length === 0) return;
    const cls = listTag === 'ul'
      ? 'list-disc pl-6 my-3 space-y-1.5'
      : 'list-decimal pl-6 my-3 space-y-1.5';
    segments.push(`<${listTag} class="${cls}">${listItems.join('')}</${listTag}>`);
    listItems = []; listTag = '';
  };
  const flushBq = () => {
    if (bqLines.length === 0) return;
    segments.push(
      `<blockquote class="border-l-4 border-indigo-300 pl-5 py-2 my-4 text-slate-600 italic bg-indigo-50/40 rounded-r-lg">${bqLines.join('')}</blockquote>`,
    );
    bqLines = [];
  };

  for (const line of lines) {
    // Code fence
    if (/^```/.test(line)) {
      if (!inCodeBlock) {
        flushPara(); flushList(); flushBq();
        inCodeBlock = true;
        codeLines = [];
      } else {
        inCodeBlock = false;
        const esc = codeLines.map(escapeHtml).join('\n');
        segments.push(
          `<pre class="bg-slate-900 text-slate-100 rounded-xl p-5 my-4 overflow-x-auto text-sm font-mono leading-relaxed"><code>${esc}</code></pre>`,
        );
      }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }

    // Heading
    if (/^#{1,6}\s/.test(line)) {
      flushPara(); flushList(); flushBq();
      const level = line.match(/^(#+)/)?.[1].length ?? 1;
      const text = line.replace(/^#+\s/, '');
      const sizes = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
      const mt = level === 1 ? 'mt-2' : level === 2 ? 'mt-6' : 'mt-4';
      segments.push(
        `<h${level} class="${sizes[Math.min(level - 1, 5)]} font-bold ${mt} mb-3 text-slate-900">${renderInline(text)}</h${level}>`,
      );
      continue;
    }

    // HR
    if (/^(---|\*\*\*|___)$/.test(line.trim())) {
      flushPara(); flushList(); flushBq();
      segments.push('<hr class="border-slate-200 my-8" />');
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      flushPara(); flushList();
      bqLines.push(`<p class="mb-1">${renderInline(line.replace(/^>\s?/, ''))}</p>`);
      continue;
    }
    if (bqLines.length > 0) flushBq();

    // Unordered list item
    if (/^[\-*+]\s/.test(line)) {
      flushPara();
      if (listTag && listTag !== 'ul') flushList();
      if (!listTag) listTag = 'ul';
      listItems.push(`<li class="text-slate-700">${renderInline(line.replace(/^[\-*+]\s/, ''))}</li>`);
      continue;
    }

    // Ordered list item
    if (/^\d+\.\s/.test(line)) {
      flushPara();
      if (listTag && listTag !== 'ol') flushList();
      if (!listTag) listTag = 'ol';
      listItems.push(`<li class="text-slate-700">${renderInline(line.replace(/^\d+\.\s/, ''))}</li>`);
      continue;
    }

    // Blank line → flush whatever is open (paragraph or list)
    if (line.trim() === '') {
      flushPara(); flushList(); flushBq();
      continue;
    }

    // Regular text — flush any open list, accumulate into paragraph
    flushList(); flushBq();
    paraLines.push(renderInline(line));
  }

  flushPara(); flushList(); flushBq();
  return segments;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MarkdownViewProps {
  content: string;
  blocks: InteractiveBlock[];
}

export function MarkdownView({ content, blocks }: MarkdownViewProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const segments = useMemo(() => parseSegments(content), [content]);

  // Paragraph-triggered blocks sorted by triggerParagraph, then sortOrder
  const paraBlocks = useMemo(
    () =>
      blocks
        .filter((b) => b.triggerParagraph != null)
        .sort((a, b) =>
          (a.triggerParagraph ?? 0) - (b.triggerParagraph ?? 0) ||
          a.sortOrder - b.sortOrder,
        ),
    [blocks],
  );

  // Blocks without any trigger — shown below all content
  const freeBlocks = blocks.filter(
    (b) => b.triggerParagraph == null && b.triggerSecond == null && b.triggerPage == null,
  );

  // First incomplete block determines the "gate" position
  const gateBlock = paraBlocks.find((b) => !completedIds.has(b.id));
  // User may read up to (and including) the gate paragraph
  const visibleUntil: number = gateBlock?.triggerParagraph ?? segments.length;

  const handleComplete = (block: InteractiveBlock) => (passed: boolean) => {
    if (!block.continueOnPassOnly || passed) {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.add(block.id);
        return next;
      });
    }
  };

  // Map: paragraph number → blocks that trigger after it
  const blockMap = useMemo(() => {
    const m = new Map<number, InteractiveBlock[]>();
    for (const b of paraBlocks) {
      const key = b.triggerParagraph!;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(b);
    }
    return m;
  }, [paraBlocks]);

  // ── Render ────────────────────────────────────────────────────────────────

  // Overall progress for summary bar
  const totalGates = paraBlocks.length;
  const doneGates = paraBlocks.filter((b) => completedIds.has(b.id)).length;

  return (
    <div className="space-y-0">
      {/* Progress bar — only when there are triggers */}
      {totalGates > 0 && (
        <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${totalGates > 0 ? (doneGates / totalGates) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            {doneGates}/{totalGates} тест
          </span>
        </div>
      )}

      {/* Interleaved segments + quizzes */}
      {segments.map((seg, i) => {
        const paraNum = i + 1;
        const isVisible = paraNum <= visibleUntil;
        const blocksHere = blockMap.get(paraNum) ?? [];
        const isGatePara = gateBlock && gateBlock.triggerParagraph === paraNum;

        if (!isVisible) return null;

        return (
          <div key={i}>
            {/* Segment HTML */}
            <div dangerouslySetInnerHTML={{ __html: seg }} />

            {/* Blocks after this paragraph */}
            {blocksHere.length > 0 && (
              <div className="my-6 space-y-4">
                {blocksHere.map((block) => {
                  const done = completedIds.has(block.id);
                  return (
                    <div
                      key={block.id}
                      className={`rounded-xl border overflow-hidden ${
                        done ? 'border-emerald-200' : 'border-amber-200'
                      }`}
                    >
                      {/* Header */}
                      <div
                        className={`flex items-center justify-between px-4 py-2.5 ${
                          done ? 'bg-emerald-50' : 'bg-amber-50'
                        }`}
                      >
                        <span className={`text-xs font-semibold uppercase tracking-wide ${done ? 'text-emerald-600' : 'text-amber-700'}`}>
                          {done ? '✓ Дууссан' : '¶ Параграф ' + paraNum + ' — Тест'}
                        </span>
                        {block.title && (
                          <span className="text-xs text-slate-500">{block.title}</span>
                        )}
                      </div>

                      {/* Quiz — hide when completed to prevent re-answering */}
                      {!done && (
                        <div className="p-4">
                          <BlockQuiz block={block} onComplete={handleComplete(block)} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Locked preview — shown after the gate paragraph quiz */}
            {isGatePara && !completedIds.has(gateBlock!.id) && i + 1 < segments.length && (
              <div className="relative mt-4 rounded-xl overflow-hidden">
                {/* Blurred preview of next content */}
                <div
                  className="blur-sm pointer-events-none select-none opacity-40 px-1"
                  aria-hidden="true"
                >
                  {segments.slice(i + 1, i + 4).map((s, j) => (
                    <div key={j} dangerouslySetInnerHTML={{ __html: s }} />
                  ))}
                </div>
                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
                  <div className="text-center px-4 py-6">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-700">Дараагийн хэсэг түгжигдсэн байна</p>
                    <p className="text-xs text-slate-400 mt-1">Дээрх тестийг хариулсны дараа нээгдэнэ</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* All gates done but no segments visible hint (edge case) */}
      {segments.length === 0 && (
        <p className="text-slate-400 italic text-sm">Контент байхгүй байна.</p>
      )}

      {/* Free blocks (no trigger) — shown at the bottom when all gates are done */}
      {freeBlocks.length > 0 && doneGates === totalGates && (
        <div className="mt-8 pt-8 border-t border-slate-200 space-y-6">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Хичээлийн даалгаварууд</p>
          {freeBlocks.map((block) => (
            <BlockQuiz
              key={block.id}
              block={block}
              onComplete={handleComplete(block)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
