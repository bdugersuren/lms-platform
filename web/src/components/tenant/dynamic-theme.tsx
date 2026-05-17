'use client';

import { useEffect } from 'react';
import type { TenantBranding } from '@/types/tenant';

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '99 102 241';
  return `${r} ${g} ${b}`;
}

export function DynamicTheme({ branding }: { branding: TenantBranding }) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', hexToRgb(branding.primaryColor));
    root.style.setProperty('--color-secondary', hexToRgb(branding.secondaryColor));
    root.style.setProperty('--color-accent', hexToRgb(branding.accentColor));
    if (branding.fontFamily) {
      root.style.setProperty('--font-tenant', `"${branding.fontFamily}"`);
    }
    if (branding.darkModeEnabled) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [branding]);

  // Inject critical CSS vars server-side via inline style tag
  const primaryRgb = hexToRgb(branding.primaryColor);
  const secondaryRgb = hexToRgb(branding.secondaryColor);
  const accentRgb = hexToRgb(branding.accentColor);

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root{--color-primary:${primaryRgb};--color-secondary:${secondaryRgb};--color-accent:${accentRgb};}`,
      }}
    />
  );
}
