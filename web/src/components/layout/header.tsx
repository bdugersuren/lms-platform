'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenant } from '@/lib/tenant-context';
import { useAuthStore } from '@/store/auth.store';
import { useLocale } from '@/hooks/use-locale';
import type { NavItem } from '@/types/tenant';
import clsx from 'clsx';

function MenuIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function NavLink({ item, locale, onClick }: { item: NavItem; locale: string; onClick?: () => void }) {
  const label = locale === 'mn' && item.labelMn ? item.labelMn : item.label;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="text-gray-700 hover:text-primary font-medium transition-colors duration-200 text-sm"
    >
      {label}
    </Link>
  );
}

export function Header() {
  const tenant = useTenant();
  const { locale, toggleLocale, t } = useLocale();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const visibleNav = [...tenant.navigation]
    .filter((n) => n.visible)
    .sort((a, b) => a.order - b.order);

  const orgName = locale === 'mn' && tenant.nameMn ? tenant.nameMn : tenant.name;

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-white/80 backdrop-blur-sm',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            {tenant.branding.logo ? (
              <img src={tenant.branding.logo} alt={orgName} className="h-8 w-auto" />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: `rgb(var(--color-primary))` }}
                >
                  {orgName.charAt(0)}
                </div>
                <span className="font-bold text-gray-900 text-sm hidden sm:block truncate max-w-[140px]">
                  {orgName}
                </span>
              </div>
            )}
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {visibleNav.map((item) => (
              <NavLink key={item.id} item={item} locale={locale} />
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            {tenant.locale === 'both' && (
              <button
                onClick={toggleLocale}
                className="hidden sm:flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-primary border border-gray-200 rounded-full px-3 py-1 transition-colors"
              >
                {locale === 'mn' ? 'EN' : 'МН'}
              </button>
            )}

            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all"
                style={{ background: `rgb(var(--color-primary))` }}
              >
                {t('Dashboard', 'Хяналтын самбар')}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex text-sm font-medium text-gray-700 hover:text-primary transition-colors"
                >
                  {t('Log in', 'Нэвтрэх')}
                </Link>
                <Link
                  href="/register"
                  className="inline-flex text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all hover:opacity-90"
                  style={{ background: `rgb(var(--color-primary))` }}
                >
                  {t('Get Started', 'Эхлэх')}
                </Link>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg"
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-4 space-y-3">
            {visibleNav.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                locale={locale}
                onClick={() => setMobileOpen(false)}
              />
            ))}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
              {tenant.locale === 'both' && (
                <button
                  onClick={() => { toggleLocale(); setMobileOpen(false); }}
                  className="text-sm text-gray-500 text-left"
                >
                  {locale === 'mn' ? 'Switch to English' : 'Монгол руу солих'}
                </button>
              )}
              {!isAuthenticated && (
                <Link href="/login" onClick={() => setMobileOpen(false)} className="text-sm text-gray-700 font-medium">
                  {t('Log in', 'Нэвтрэх')}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
