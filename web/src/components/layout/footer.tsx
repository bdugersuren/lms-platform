'use client';

import Link from 'next/link';
import { useTenant } from '@/lib/tenant-context';
import { useLocale } from '@/hooks/use-locale';
import type { SocialLink, SocialPlatform } from '@/types/tenant';

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  const icons: Record<SocialPlatform, string> = {
    facebook: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
    instagram: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 19.5h11a3 3 0 003-3v-11a3 3 0 00-3-3h-11a3 3 0 00-3 3v11a3 3 0 003 3z',
    twitter: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z',
    youtube: 'M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z',
    linkedin: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z',
    tiktok: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.25 8.25 0 004.83 1.54V6.77a4.85 4.85 0 01-1.06-.08z',
  };
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={icons[platform]} />
    </svg>
  );
}

function SocialLinks({ links }: { links: SocialLink[] }) {
  return (
    <div className="flex gap-3 mt-4">
      {links.map((link) => (
        <a
          key={link.platform}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 rounded-full border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors"
        >
          <SocialIcon platform={link.platform} />
        </a>
      ))}
    </div>
  );
}

export function Footer() {
  const tenant = useTenant();
  const { locale, t } = useLocale();
  const f = tenant.footer;

  const orgName = locale === 'mn' && tenant.nameMn ? tenant.nameMn : tenant.name;
  const description = locale === 'mn' && f.descriptionMn ? f.descriptionMn : f.description;
  const address = locale === 'mn' && f.addressMn ? f.addressMn : f.address;

  const visibleNav = [...tenant.navigation]
    .filter((n) => n.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              {tenant.branding.logo ? (
                <img src={tenant.branding.logo} alt={orgName} className="h-8 w-auto brightness-0 invert" />
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: `rgb(var(--color-primary))` }}
                  >
                    {orgName.charAt(0)}
                  </div>
                  <span className="font-bold text-white text-lg">{orgName}</span>
                </div>
              )}
            </div>
            {description && <p className="text-sm leading-relaxed text-gray-400 max-w-xs">{description}</p>}
            {f.socialLinks && f.socialLinks.length > 0 && (
              <SocialLinks links={f.socialLinks} />
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              {t('Quick Links', 'Хурдан холбоосууд')}
            </h3>
            <ul className="space-y-2">
              {visibleNav.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {locale === 'mn' && item.labelMn ? item.labelMn : item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              {t('Contact', 'Холбоо барих')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {f.contactEmail && (
                <li>
                  <a href={`mailto:${f.contactEmail}`} className="hover:text-white transition-colors">
                    {f.contactEmail}
                  </a>
                </li>
              )}
              {f.contactPhone && (
                <li>
                  <a href={`tel:${f.contactPhone}`} className="hover:text-white transition-colors">
                    {f.contactPhone}
                  </a>
                </li>
              )}
              {address && <li>{address}</li>}
            </ul>
            {f.policyLinks && f.policyLinks.length > 0 && (
              <ul className="mt-4 space-y-2">
                {f.policyLinks.map((p, i) => (
                  <li key={i}>
                    <Link href={p.href} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                      {locale === 'mn' && p.labelMn ? p.labelMn : p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-gray-600">
            {f.copyright ?? `© ${new Date().getFullYear()} ${orgName}. All rights reserved.`}
          </p>
          <p className="text-xs text-gray-700">
            Powered by LMS Platform
          </p>
        </div>
      </div>
    </footer>
  );
}
