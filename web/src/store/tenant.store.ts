'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'mn' | 'en';

interface TenantUIState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useTenantStore = create<TenantUIState>()(
  persist(
    (set) => ({
      locale: 'mn',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'lms-tenant-ui' },
  ),
);
