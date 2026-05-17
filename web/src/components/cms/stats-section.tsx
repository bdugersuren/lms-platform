'use client';

import { useLocale } from '@/hooks/use-locale';
import type { StatisticsConfig, StatItem } from '@/types/cms';

function StatIcon({ icon }: { icon?: StatItem['icon'] }) {
  const paths: Record<string, string> = {
    users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z',
    book: 'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z',
    award: 'M12 15a7 7 0 100-14 7 7 0 000 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12',
    certificate: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    chart: 'M18 20V10M12 20V4M6 20v-6',
  };
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[icon ?? 'star'] ?? paths.star} />
    </svg>
  );
}

export function StatsSection({ config }: { config: StatisticsConfig }) {
  const { t } = useLocale();

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {config.items.map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: `linear-gradient(135deg, rgb(var(--color-primary) / 0.1), rgb(var(--color-secondary) / 0.1))`,
                  color: `rgb(var(--color-primary))`,
                }}
              >
                <StatIcon icon={item.icon} />
              </div>
              <div className="text-3xl font-extrabold text-gray-900 mb-1 animate-count-up">
                {item.value}
              </div>
              <div className="text-sm text-gray-500 font-medium">
                {t(item.label, item.labelMn)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
