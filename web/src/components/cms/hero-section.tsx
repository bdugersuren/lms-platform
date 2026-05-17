'use client';

import Link from 'next/link';
import { useLocale } from '@/hooks/use-locale';
import type { HeroConfig } from '@/types/cms';

export function HeroSection({ config }: { config: HeroConfig }) {
  const { t } = useLocale();

  const title = t(config.title, config.titleMn);
  const subtitle = config.subtitle ? t(config.subtitle, config.subtitleMn) : null;
  const ctaPrimary = config.ctaPrimary;
  const ctaSecondary = config.ctaSecondary;
  const stats = config.stats ?? [];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      {config.backgroundImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${config.backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-black/50" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, rgb(var(--color-primary)) 0%, rgb(var(--color-secondary)) 60%, rgb(var(--color-accent)) 100%)`,
          }}
        />
      )}

      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: `rgb(var(--color-accent))` }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'white' }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-white text-sm font-medium mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          {t('Explore New Courses', 'Шинэ хичээлүүдийг судал')}
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6 animate-slide-up">
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up">
            {subtitle}
          </p>
        )}

        {/* CTA buttons */}
        {(ctaPrimary || ctaSecondary) && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in">
            {ctaPrimary && (
              <Link
                href={ctaPrimary.href}
                className="inline-flex items-center gap-2 bg-white font-bold text-sm px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                style={{ color: `rgb(var(--color-primary))` }}
              >
                {t(ctaPrimary.label, ctaPrimary.labelMn)}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            )}
            {ctaSecondary && (
              <Link
                href={ctaSecondary.href}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold text-sm px-8 py-4 rounded-xl hover:bg-white/20 transition-all duration-200"
              >
                {t(ctaSecondary.label, ctaSecondary.labelMn)}
              </Link>
            )}
          </div>
        )}

        {/* Stats */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-center"
              >
                <div className="text-2xl sm:text-3xl font-extrabold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-white/70 font-medium">
                  {t(stat.label, stat.labelMn)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 80L1440 80L1440 40C1200 80 900 0 720 20C540 40 240 80 0 40L0 80Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
