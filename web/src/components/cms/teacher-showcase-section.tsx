'use client';

import { useLocale } from '@/hooks/use-locale';
import type { TeacherShowcaseConfig } from '@/types/cms';

export function TeacherShowcaseSection({ config }: { config: TeacherShowcaseConfig }) {
  const { t } = useLocale();

  const title = t(config.title ?? 'Meet Our Expert Instructors', config.titleMn);
  const items = config.items ?? [];

  if (items.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-2"
            style={{ color: `rgb(var(--color-primary))` }}
          >
            {t('Our Team', 'Манай баг')}
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">{title}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((teacher) => {
            const role = teacher.role ? t(teacher.role, teacher.roleMn) : null;
            const bio = teacher.bio ? t(teacher.bio, teacher.bioMn) : null;

            return (
              <div
                key={teacher.id}
                className="group text-center bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                {/* Avatar */}
                {teacher.avatar ? (
                  <img
                    src={teacher.avatar}
                    alt={teacher.name}
                    className="w-20 h-20 rounded-full object-cover mx-auto mb-4 ring-4 ring-gray-100 group-hover:ring-primary/20 transition-all"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-extrabold ring-4 ring-gray-100 group-hover:ring-primary/20 transition-all"
                    style={{ background: `linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))` }}
                  >
                    {teacher.name.charAt(0)}
                  </div>
                )}

                <h3 className="font-bold text-gray-900 mb-1">{teacher.name}</h3>
                {role && (
                  <p className="text-sm font-medium mb-2" style={{ color: `rgb(var(--color-primary))` }}>
                    {role}
                  </p>
                )}
                {bio && <p className="text-xs text-gray-500 leading-relaxed mb-4">{bio}</p>}

                <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-50 text-sm text-gray-500">
                  {teacher.courseCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {teacher.courseCount}
                    </span>
                  )}
                  {teacher.rating !== undefined && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      {teacher.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
