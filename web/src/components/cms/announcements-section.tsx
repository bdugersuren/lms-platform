'use client';

import { useLocale } from '@/hooks/use-locale';
import type { AnnouncementsConfig, AnnouncementType } from '@/types/cms';
import clsx from 'clsx';

const typeStyles: Record<AnnouncementType, { bg: string; text: string; label: string; labelMn: string }> = {
  info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', label: 'Info', labelMn: 'Мэдээлэл' },
  warning: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', label: 'Warning', labelMn: 'Анхааруулга' },
  success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', label: 'Success', labelMn: 'Мэдэгдэл' },
  event: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800', label: 'Event', labelMn: 'Арга хэмжээ' },
};

export function AnnouncementsSection({ config }: { config: AnnouncementsConfig }) {
  const { t } = useLocale();

  const title = t(config.title ?? 'Announcements', config.titleMn);
  const items = config.items ?? [];

  const now = new Date();
  const active = items.filter((a) => !a.expiresAt || new Date(a.expiresAt) > now);

  if (active.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: `rgb(var(--color-primary))` }}>
            {t('Updates', 'Шинэчлэлт')}
          </p>
          <h2 className="text-3xl font-extrabold text-gray-900">{title}</h2>
        </div>

        <div className="space-y-4">
          {active.map((item) => {
            const s = typeStyles[item.type];
            const itemTitle = t(item.title, item.titleMn);
            const content = t(item.content, item.contentMn);
            const date = new Date(item.publishedAt).toLocaleDateString('mn-MN');
            const typeLabel = t(s.label, s.labelMn);

            return (
              <div key={item.id} className={clsx('rounded-xl border p-5', s.bg)}>
                <div className="flex items-start gap-3">
                  <span className={clsx('inline-flex text-xs font-bold px-2.5 py-1 rounded-full shrink-0 mt-0.5', s.text, 'bg-white/70')}>
                    {typeLabel}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className={clsx('font-bold text-sm mb-1', s.text)}>{itemTitle}</h3>
                    <p className={clsx('text-sm leading-relaxed', s.text, 'opacity-80')}>{content}</p>
                    <p className={clsx('text-xs mt-2 opacity-60', s.text)}>{date}</p>
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
