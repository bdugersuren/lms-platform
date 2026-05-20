'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMe } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { isAdmin } from '@/lib/rbac';
import { useTenant } from '@/lib/tenant-context';
import { useUpdateTenantSettings, type UpdateTenantDto } from '@/hooks/use-tenant-settings';
import type { SocialPlatform } from '@/types/tenant';

type Tab = 'branding' | 'seo' | 'social';

const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string; placeholder: string }[] = [
  { value: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { value: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { value: 'twitter', label: 'Twitter / X', placeholder: 'https://twitter.com/...' },
  { value: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
  { value: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/...' },
  { value: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/...' },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: me, isLoading: meLoading } = useMe();
  const tenant = useTenant();
  const updateSettings = useUpdateTenantSettings();

  const [tab, setTab] = useState<Tab>('branding');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Branding
  const [orgName, setOrgName] = useState('');
  const [orgNameMn, setOrgNameMn] = useState('');
  const [tagline, setTagline] = useState('');
  const [taglineMn, setTaglineMn] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  // SEO
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [ogImage, setOgImage] = useState('');

  // Social
  const [socials, setSocials] = useState<Record<SocialPlatform, string>>({
    facebook: '', instagram: '', twitter: '', youtube: '', linkedin: '', tiktok: '',
  });

  // Populate from tenant config
  useEffect(() => {
    setOrgName(tenant.name);
    setOrgNameMn(tenant.nameMn ?? '');
    setTagline(tenant.tagline ?? '');
    setTaglineMn(tenant.taglineMn ?? '');
    setPrimaryColor(tenant.branding.primaryColor);
    setSecondaryColor(tenant.branding.secondaryColor);
    setLogoUrl(tenant.branding.logo ?? '');
    setDarkMode(tenant.branding.darkModeEnabled);
    setSeoTitle(tenant.seo.title);
    setSeoDescription(tenant.seo.description);
    setSeoKeywords(tenant.seo.keywords ?? '');
    setOgImage(tenant.seo.ogImage ?? '');
    const socialMap: Record<SocialPlatform, string> = {
      facebook: '', instagram: '', twitter: '', youtube: '', linkedin: '', tiktok: '',
    };
    (tenant.footer.socialLinks ?? []).forEach((s) => {
      socialMap[s.platform] = s.url;
    });
    setSocials(socialMap);
  }, [tenant]);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!meLoading && me && !isAdmin(me.role)) router.replace('/dashboard');
  }, [me, meLoading, router]);

  if (!isAuthenticated || meLoading) return null;
  if (me && !isAdmin(me.role)) return null;

  const handleSave = () => {
    setSuccess('');
    setError('');

    let dto: UpdateTenantDto = {};

    if (tab === 'branding') {
      dto = {
        name: orgName,
        nameMn: orgNameMn,
        tagline,
        taglineMn,
        branding: {
          primaryColor,
          secondaryColor,
          logo: logoUrl || undefined,
          darkModeEnabled: darkMode,
        },
      };
    } else if (tab === 'seo') {
      dto = {
        seo: {
          title: seoTitle,
          description: seoDescription,
          keywords: seoKeywords || undefined,
          ogImage: ogImage || undefined,
        },
      };
    } else if (tab === 'social') {
      const socialLinks = SOCIAL_PLATFORMS
        .filter((p) => socials[p.value])
        .map((p) => ({ platform: p.value, url: socials[p.value] }));
      dto = { footer: { socialLinks } };
    }

    updateSettings.mutate(dto, {
      onSuccess: () => setSuccess('Тохиргоо амжилттай хадгалагдлаа'),
      onError: (e: Error) => setError(e.message),
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              ← Админ
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-900">Байгууллагын тохиргоо</span>
          </div>
          <button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {updateSettings.isPending ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {(['branding', 'seo', 'social'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSuccess(''); setError(''); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'branding' ? 'Брэндинг' : t === 'seo' ? 'SEO' : 'Нийгмийн сүлжээ'}
            </button>
          ))}
        </div>

        {/* Success / Error */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Branding Tab */}
        {tab === 'branding' && (
          <div className="space-y-6">
            <Section title="Байгууллагын мэдээлэл">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Нэр (Монгол)">
                  <input
                    value={orgNameMn}
                    onChange={(e) => setOrgNameMn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="Байгууллагын нэр"
                  />
                </Field>
                <Field label="Нэр (Англи)">
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="Organization name"
                  />
                </Field>
                <Field label="Уриа үг (Монгол)">
                  <input
                    value={taglineMn}
                    onChange={(e) => setTaglineMn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="Таны уриа үг"
                  />
                </Field>
                <Field label="Уриа үг (Англи)">
                  <input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="Your tagline"
                  />
                </Field>
              </div>
            </Section>

            <Section title="Өнгөний тохиргоо">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Үндсэн өнгө (Primary)">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor.startsWith('#') ? primaryColor : `#${primaryColor}`}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                      placeholder="#4f46e5 эсвэл 79 70 229"
                    />
                  </div>
                </Field>
                <Field label="Хоёрдогч өнгө (Secondary)">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor.startsWith('#') ? secondaryColor : '#6366f1'}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                      placeholder="#6366f1"
                    />
                  </div>
                </Field>
              </div>
            </Section>

            <Section title="Лого ба загвар">
              <Field label="Логоны URL">
                <input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="https://..."
                />
                {logoUrl && (
                  <img src={logoUrl} alt="preview" className="mt-2 h-12 object-contain rounded" />
                )}
              </Field>
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setDarkMode((v) => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-gray-700">Dark mode идэвхжүүлэх</span>
              </div>
            </Section>
          </div>
        )}

        {/* SEO Tab */}
        {tab === 'seo' && (
          <div className="space-y-6">
            <Section title="Хуудасны мэдээлэл">
              <div className="space-y-4">
                <Field label="Хуудасны гарчиг (Title)">
                  <input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="LMS Platform - Online Learning"
                    maxLength={70}
                  />
                  <p className="text-xs text-gray-400 mt-1">{seoTitle.length}/70 тэмдэгт</p>
                </Field>
                <Field label="Тайлбар (Description)">
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                    rows={3}
                    placeholder="Таны платформын тайлбар..."
                    maxLength={160}
                  />
                  <p className="text-xs text-gray-400 mt-1">{seoDescription.length}/160 тэмдэгт</p>
                </Field>
                <Field label="Түлхүүр үгс (Keywords)">
                  <input
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="lms, сургалт, online learning"
                  />
                </Field>
                <Field label="OG Image URL">
                  <input
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="https://..."
                  />
                  {ogImage && (
                    <img src={ogImage} alt="OG preview" className="mt-2 w-full max-w-sm rounded border border-gray-200" />
                  )}
                </Field>
              </div>
            </Section>
          </div>
        )}

        {/* Social Tab */}
        {tab === 'social' && (
          <div className="space-y-6">
            <Section title="Нийгмийн сүлжээний линкүүд">
              <div className="space-y-3">
                {SOCIAL_PLATFORMS.map((p) => (
                  <Field key={p.value} label={p.label}>
                    <input
                      value={socials[p.value]}
                      onChange={(e) => setSocials((prev) => ({ ...prev, [p.value]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                      placeholder={p.placeholder}
                      type="url"
                    />
                  </Field>
                ))}
              </div>
            </Section>
          </div>
        )}
      </main>

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
