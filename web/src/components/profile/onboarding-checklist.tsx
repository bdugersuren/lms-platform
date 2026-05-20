'use client';

import Link from 'next/link';
import { clsx } from 'clsx';
import type { CompletionResult, ProfileStep } from '@/lib/profile-completion';

interface OnboardingChecklistProps {
  completion: CompletionResult;
  locale?: string;
  compact?: boolean;
}

function StepRow({ step, locale, compact }: { step: ProfileStep; locale: string; compact: boolean }) {
  const label = locale === 'mn' ? step.labelMn : step.label;

  return (
    <div className={clsx('flex items-center gap-3', compact ? 'py-1.5' : 'py-2')}>
      {step.done ? (
        <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : (
        <span className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
      )}

      {step.done ? (
        <span className={clsx('text-sm text-gray-400 line-through', compact && 'text-xs')}>
          {label}
        </span>
      ) : (
        <Link
          href={step.href}
          className={clsx(
            'text-sm text-gray-700 hover:text-indigo-600 hover:underline transition-colors',
            compact && 'text-xs',
          )}
        >
          {label}
        </Link>
      )}

      <span className="ml-auto text-xs text-gray-300">+{step.weight}</span>
    </div>
  );
}

export function OnboardingChecklist({ completion, locale = 'mn', compact = false }: OnboardingChecklistProps) {
  const { steps, score } = completion;
  const t = (en: string, mn: string) => (locale === 'mn' ? mn : en);

  return (
    <div>
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">
            {t('Getting started checklist', 'Эхлэлийн жагсаалт')}
          </h3>
          <span className="text-xs text-gray-500">
            {steps.filter((s) => s.done).length}/{steps.length}{' '}
            {t('complete', 'дүүрсэн')}
          </span>
        </div>
      )}

      <div className={clsx(!compact && 'divide-y divide-gray-50')}>
        {steps.map((step) => (
          <StepRow key={step.key} step={step} locale={locale} compact={compact} />
        ))}
      </div>

      {!compact && score >= 80 && (
        <p className="mt-3 text-xs text-green-600 flex items-center gap-1">
          <span>🎉</span>
          {t('Great job! Your profile is looking great.', 'Гайхалтай! Профайл тань гоё харагдаж байна.')}
        </p>
      )}
    </div>
  );
}
