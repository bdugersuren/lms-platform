'use client';

import Link from 'next/link';
import { clsx } from 'clsx';
import type { CompletionResult } from '@/lib/profile-completion';
import { getCompletionBadge } from '@/lib/profile-completion';

interface CompletionCardProps {
  completion: CompletionResult;
  locale?: string;
  onDismiss?: () => void;
}

export function CompletionCard({ completion, locale = 'mn', onDismiss }: CompletionCardProps) {
  const { score, steps, isCertificateReady, certificateBlocker } = completion;
  const badge = getCompletionBadge(score);
  const t = (en: string, mn: string) => (locale === 'mn' ? mn : en);
  const pendingSteps = steps.filter((s) => !s.done);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            {t('Profile Completion', 'Профайл дүүргэлт')}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('Complete your profile to unlock all features', 'Профайлаа бөглөж бүх боломжийг нээ')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', badge.color)}>
            {t(badge.label, badge.labelMn)}
          </span>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              aria-label={t('Dismiss', 'Хаах')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">{t('Progress', 'Явц')}</span>
          <span className="text-xs font-semibold text-gray-700">{score}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-400' : 'bg-indigo-500',
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Pending steps */}
      {pendingSteps.length > 0 && (
        <div className="space-y-2 mb-4">
          {pendingSteps.slice(0, 3).map((step) => (
            <Link
              key={step.key}
              href={step.href}
              className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-indigo-600 group"
            >
              <span className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-indigo-400 flex-shrink-0 transition-colors" />
              <span className="group-hover:underline">
                {t(step.label, step.labelMn)}
              </span>
            </Link>
          ))}
          {pendingSteps.length > 3 && (
            <p className="text-xs text-gray-400 pl-6">
              {t(`+${pendingSteps.length - 3} more`, `+${pendingSteps.length - 3} үлдсэн`)}
            </p>
          )}
        </div>
      )}

      {/* Completed state */}
      {pendingSteps.length === 0 && (
        <p className="text-sm text-green-600 flex items-center gap-1.5 mb-4">
          <span>✓</span>
          {t('Profile complete!', 'Профайл бүрэн!')}
        </p>
      )}

      {/* Certificate readiness */}
      {!isCertificateReady && certificateBlocker && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-amber-700 flex items-start gap-1.5">
            <span className="mt-0.5 flex-shrink-0">⚠</span>
            <span>
              {t('Certificate readiness: ', 'Гэрчилгээний бэлэн байдал: ')}
              {certificateBlocker}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
