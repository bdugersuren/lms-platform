'use client';

import { useMemo, useState } from 'react';
import type { InteractiveBlock } from '@/types/course';
import { BlockQuiz } from './block-quiz';

// ─── Simple Markdown → HTML parser ───────────────────────────────────────────

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
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold"><em class="italic">$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[0.85em] font-mono">$1</code>');
}

function parseMarkdown(md: string): string {
  const lines = md.split('\n');
  const output: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let inList = false;
  let listTag = '';
  let inBlockquote = false;

  const closeList = () => {
    if (inList) { output.push(`</${listTag}>`); inList = false; listTag = ''; }
  };
  const closeBlockquote = () => {
    if (inBlockquote) { output.push('</blockquote>'); inBlockquote = false; }
  };

  for (const raw of lines) {
    const line = raw;

    // Code fence
    if (/^```/.test(line)) {
      if (!inCodeBlock) {
        closeList(); closeBlockquote();
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        inCodeBlock = false;
        const escaped = codeLines.map((l) => escapeHtml(l)).join('\n');
        output.push(
          `<pre class="bg-slate-900 text-slate-100 rounded-xl p-5 my-4 overflow-x-auto text-sm font-mono leading-relaxed"><code>${escaped}</code></pre>`,
        );
      }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }

    // Headings
    if (/^#{1,6}\s/.test(line)) {
      closeList(); closeBlockquote();
      const level = (line.match(/^(#+)/)?.[1].length ?? 1);
      const text = line.replace(/^#+\s/, '');
      const sizes = ['text-3xl','text-2xl','text-xl','text-lg','text-base','text-sm'];
      const sz = sizes[Math.min(level - 1, 5)];
      const mt = level === 1 ? 'mt-8' : level === 2 ? 'mt-6' : 'mt-4';
      output.push(`<h${level} class="${sz} font-bold ${mt} mb-3 text-slate-900">${renderInline(text)}</h${level}>`);
      continue;
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)$/.test(line.trim())) {
      closeList(); closeBlockquote();
      output.push('<hr class="border-slate-200 my-8" />');
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      closeList();
      if (!inBlockquote) {
        output.push('<blockquote class="border-l-4 border-indigo-300 pl-5 py-1 my-4 text-slate-600 italic bg-indigo-50/40 rounded-r-lg">');
        inBlockquote = true;
      }
      output.push(`<p class="mb-1">${renderInline(line.replace(/^>\s?/, ''))}</p>`);
      continue;
    }
    closeBlockquote();

    // Unordered list
    if (/^[\-\*\+]\s/.test(line)) {
      if (!inList || listTag !== 'ul') {
        closeList();
        output.push('<ul class="list-disc pl-6 my-3 space-y-1.5">');
        inList = true; listTag = 'ul';
      }
      output.push(`<li class="text-slate-700">${renderInline(line.replace(/^[\-\*\+]\s/, ''))}</li>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      if (!inList || listTag !== 'ol') {
        closeList();
        output.push('<ol class="list-decimal pl-6 my-3 space-y-1.5">');
        inList = true; listTag = 'ol';
      }
      output.push(`<li class="text-slate-700">${renderInline(line.replace(/^\d+\.\s/, ''))}</li>`);
      continue;
    }

    closeList();

    // Blank line
    if (line.trim() === '') {
      output.push('<div class="mb-3" />');
      continue;
    }

    // Paragraph
    output.push(`<p class="mb-3 text-slate-700 leading-relaxed">${renderInline(line)}</p>`);
  }

  closeList(); closeBlockquote();
  return output.join('\n');
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MarkdownViewProps {
  content: string;
  blocks: InteractiveBlock[];
}

export function MarkdownView({ content, blocks }: MarkdownViewProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const html = useMemo(() => parseMarkdown(content), [content]);

  const handleComplete = (id: string) => () => {
    setCompletedIds((prev) => { const next = new Set(prev); next.add(id); return next; });
  };

  const paragraphBlocks = blocks.filter((b) => b.triggerParagraph != null);
  const otherBlocks = blocks.filter(
    (b) => b.triggerParagraph == null && b.triggerSecond == null && b.triggerPage == null,
  );

  return (
    <div>
      {/* Rendered markdown */}
      <div
        className="max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Paragraph-triggered blocks */}
      {paragraphBlocks.length > 0 && (
        <div className="mt-8 space-y-4 border-t border-slate-200 pt-8">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Параграфын дараа</p>
          {paragraphBlocks.map((block) => (
            <div key={block.id} className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2">
                <span className="text-xs text-slate-500 font-medium">¶ {block.triggerParagraph} дараа</span>
              </div>
              <div className="p-4">
                <BlockQuiz block={block} onComplete={handleComplete(block.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Other blocks */}
      {otherBlocks.length > 0 && (
        <div className="mt-8 space-y-6 border-t border-slate-200 pt-8">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Хичээлийн даалгаварууд</p>
          {otherBlocks.map((block) => (
            <BlockQuiz key={block.id} block={block} onComplete={handleComplete(block.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
