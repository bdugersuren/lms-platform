'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { InteractiveBlock } from '@/types/course';
import { useMediaUrl } from '@/hooks/use-media-url';
import { BlockQuiz } from './block-quiz';

interface PdfViewerProps {
  url: string;
  blocks: InteractiveBlock[];
}

// ─── PDF.js lazy loader ───────────────────────────────────────────────────────

type PDFDocumentProxy = import('pdfjs-dist').PDFDocumentProxy;

async function loadPdfJs() {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  return pdfjsLib;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PdfViewer({ url, blocks }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  // Quiz that must be answered before the user can advance to the next page
  const [gateBlock, setGateBlock] = useState<InteractiveBlock | null>(null);
  // Page the user wants to go to — held while the quiz gate is open
  const pendingPageRef = useRef<number | null>(null);

  const { mediaUrl, loading: mediaLoading, error: mediaError, refresh } = useMediaUrl(url);

  // Page-triggered blocks sorted ascending
  const pageBlocks = blocks
    .filter((b) => b.triggerPage != null)
    .sort((a, b) => (a.triggerPage ?? 0) - (b.triggerPage ?? 0));

  // Blocks with no trigger (shown below the viewer)
  const otherBlocks = blocks.filter(
    (b) => b.triggerPage == null && b.triggerSecond == null && b.triggerParagraph == null,
  );

  // ── Load PDF document ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mediaUrl) return;
    let cancelled = false;

    (async () => {
      try {
        setLoadError(null);
        const pdfjsLib = await loadPdfJs();
        const doc = await pdfjsLib.getDocument({
          url: mediaUrl,
          // Disable the built-in text layer to reduce memory, and prevent text-select copy
          disableRange: false,
          disableStream: false,
        }).promise;
        if (cancelled) { doc.destroy(); return; }
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (e: unknown) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'PDF ачаалагдсангүй');
      }
    })();

    return () => { cancelled = true; };
  }, [mediaUrl]);

  // ── Render current page ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    let cancelled = false;
    setRendering(true);

    (async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const canvas = canvasRef.current!;

        const containerWidth = canvas.parentElement?.clientWidth ?? 800;
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        const scaled = page.getViewport({ scale });

        canvas.width = scaled.width;
        canvas.height = scaled.height;

        const task = page.render({ canvas, viewport: scaled });
        renderTaskRef.current = task;

        await task.promise;
        if (!cancelled) setRendering(false);
      } catch (e: unknown) {
        // RenderingCancelledException is expected when we switch pages quickly
        if (!cancelled && (e as { name?: string }).name !== 'RenderingCancelledException') {
          setLoadError('Хуудас дүрсэлж чадсангүй');
          setRendering(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [pdfDoc, currentPage]);

  // ── Navigation with quiz gate ───────────────────────────────────────────────

  const goToPage = useCallback((target: number) => {
    if (target < 1 || target > totalPages) return;

    if (target > currentPage) {
      // Going forward: check if any page block triggers on the CURRENT page and is unfinished
      const blocker = pageBlocks.find(
        (b) => b.triggerPage === currentPage && !completedIds.has(b.id),
      );
      if (blocker) {
        pendingPageRef.current = target;
        setGateBlock(blocker);
        return;
      }
    }

    setCurrentPage(target);
  }, [currentPage, totalPages, pageBlocks, completedIds]);

  const handleGateComplete = (passed: boolean) => {
    if (!gateBlock) return;
    const block = gateBlock;

    setCompletedIds((prev) => { const next = new Set(prev); next.add(block.id); return next; });
    setGateBlock(null);

    const shouldAdvance = !block.continueOnPassOnly || passed;
    if (shouldAdvance && pendingPageRef.current != null) {
      setCurrentPage(pendingPageRef.current);
    }
    pendingPageRef.current = null;
  };

  // ── Progress summary for completed blocks ───────────────────────────────────
  const completedPageBlocks = pageBlocks.filter((b) => completedIds.has(b.id));
  const pendingPageBlocks = pageBlocks.filter((b) => !completedIds.has(b.id));

  // ── Loading / error states ──────────────────────────────────────────────────
  if (mediaLoading) {
    return (
      <div className="flex items-center justify-center h-[600px] rounded-2xl border border-slate-200 bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (mediaError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        <span className="text-4xl mb-3">⚠️</span>
        <p className="text-sm">PDF ачаалагдсангүй</p>
        <p className="text-xs text-red-400 mt-1 max-w-xs text-center break-all">{mediaError}</p>
        <button
          onClick={() => refresh()}
          className="mt-3 px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Дахин оролдох
        </button>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        <span className="text-4xl mb-3">📄</span>
        <p className="text-sm">{loadError}</p>
        <button
          onClick={() => { setLoadError(null); refresh(); }}
          className="mt-3 px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Дахин оролдох
        </button>
      </div>
    );
  }

  const isBlocked = gateBlock != null;
  const currentPageHasPendingBlock = pageBlocks.some(
    (b) => b.triggerPage === currentPage && !completedIds.has(b.id),
  );

  return (
    <div className="space-y-4">
      {/* Progress chips */}
      {pageBlocks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pageBlocks.map((b) => (
            <span
              key={b.id}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                completedIds.has(b.id)
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {completedIds.has(b.id) ? '✓ ' : ''}
              Хуудас {b.triggerPage} · {b.title ?? 'Тест'}
            </span>
          ))}
        </div>
      )}

      {/* PDF canvas + overlay */}
      <div
        className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Gate quiz overlay */}
        {isBlocked && gateBlock && (
          <div className="absolute inset-0 bg-black/70 z-10 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-2xl">
              <div className="mb-3 px-4 py-2 bg-amber-100 text-amber-800 rounded-xl text-sm font-medium text-center">
                Дараагийн хуудас руу үргэлжлэхийн тулд доорх тестийг хариулна уу
              </div>
              <BlockQuiz block={gateBlock} onComplete={handleGateComplete} />
            </div>
          </div>
        )}

        {/* Spinner while rendering page */}
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* The actual canvas */}
        <canvas
          ref={canvasRef}
          className="block w-full"
          style={{ display: pdfDoc ? 'block' : 'none' }}
        />

        {/* Placeholder before doc loads */}
        {!pdfDoc && !loadError && (
          <div className="flex items-center justify-center h-[680px] bg-slate-50">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Navigation bar */}
      {pdfDoc && (
        <div className="flex items-center justify-between gap-3 px-1">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1 || rendering || isBlocked}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Өмнөх
          </button>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">{currentPage}</span>
            <span className="text-slate-400">/</span>
            <span>{totalPages}</span>
            {currentPageHasPendingBlock && !isBlocked && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                Тест хариулах шаардлагатай
              </span>
            )}
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages || rendering || isBlocked}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Дараагийн →
          </button>
        </div>
      )}

      {/* Non-triggered blocks shown below */}
      {otherBlocks.length > 0 && (
        <div className="space-y-4 pt-2">
          {otherBlocks.map((block) => (
            <BlockQuiz
              key={block.id}
              block={block}
              onComplete={() => setCompletedIds((prev) => { const next = new Set(prev); next.add(block.id); return next; })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
