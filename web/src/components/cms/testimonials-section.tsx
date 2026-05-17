'use client';

import { useLocale } from '@/hooks/use-locale';
import type { TestimonialsConfig } from '@/types/cms';
import clsx from 'clsx';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 mb-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={clsx('w-4 h-4', i < rating ? 'text-yellow-400' : 'text-gray-200')}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsSection({ config }: { config: TestimonialsConfig }) {
  const { t } = useLocale();

  const title = t(config.title ?? 'What Our Students Say', config.titleMn);
  const items = config.items ?? [];

  if (items.length === 0) return null;

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-2"
            style={{ color: `rgb(var(--color-primary))` }}
          >
            {t('Testimonials', 'Сурагчдын санал')}
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">{title}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const content = t(item.content, item.contentMn);
            const role = item.role ? t(item.role, item.roleMn) : null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 flex flex-col"
              >
                {/* Quote icon */}
                <div className="mb-4" style={{ color: `rgb(var(--color-primary) / 0.2)` }}>
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>

                {item.rating && <StarRating rating={item.rating} />}

                <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6">{content}</p>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                  {item.avatar ? (
                    <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: `linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))` }}
                    >
                      {item.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{item.name}</div>
                    {role && <div className="text-xs text-gray-500">{role}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
