'use client';

import { useTenantStore, type Locale } from '@/store/tenant.store';

export function useLocale() {
  const locale = useTenantStore((s) => s.locale);
  const setLocale = useTenantStore((s) => s.setLocale);

  function t(en: string, mn?: string): string {
    if (locale === 'mn' && mn) return mn;
    return en;
  }

  function toggleLocale() {
    setLocale(locale === 'mn' ? 'en' : 'mn');
  }

  return { locale, setLocale, toggleLocale, t } as const;
}

export type { Locale };
