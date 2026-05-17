'use client';

import { useLocale } from '@/hooks/use-locale';
import type { PartnersConfig } from '@/types/cms';

export function PartnersSection({ config }: { config: PartnersConfig }) {
  const { t } = useLocale();

  const title = t(config.title ?? 'Our Partners', config.titleMn);
  const items = config.items ?? [];

  if (items.length === 0) return null;

  return (
    <section className="py-14 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-widest mb-8">
          {title}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {items.map((partner) => (
            partner.url ? (
              <a
                key={partner.id}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-50 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              >
                {partner.logo ? (
                  <img src={partner.logo} alt={partner.name} className="h-10 w-auto object-contain" />
                ) : (
                  <span className="text-lg font-bold text-gray-400">{partner.name}</span>
                )}
              </a>
            ) : (
              <div key={partner.id} className="opacity-50 grayscale">
                {partner.logo ? (
                  <img src={partner.logo} alt={partner.name} className="h-10 w-auto object-contain" />
                ) : (
                  <span className="text-lg font-bold text-gray-400">{partner.name}</span>
                )}
              </div>
            )
          ))}
        </div>
      </div>
    </section>
  );
}
