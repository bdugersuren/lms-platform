'use client';

import { useState } from 'react';
import { useLocale } from '@/hooks/use-locale';
import type { FaqConfig } from '@/types/cms';
import clsx from 'clsx';

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm pr-4">{question}</span>
        <span
          className={clsx(
            'shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200',
            isOpen ? 'rotate-180' : 'rotate-0',
          )}
          style={{ color: `rgb(var(--color-primary))` }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}

export function FaqSection({ config }: { config: FaqConfig }) {
  const { t } = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);

  const title = t(config.title ?? 'Frequently Asked Questions', config.titleMn);
  const items = config.items ?? [];

  if (items.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-2"
            style={{ color: `rgb(var(--color-primary))` }}
          >
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">{title}</h2>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <FaqItem
              key={item.id}
              question={t(item.question, item.questionMn)}
              answer={t(item.answer, item.answerMn)}
              isOpen={openId === item.id}
              onToggle={() => setOpenId(openId === item.id ? null : item.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
