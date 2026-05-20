'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMe } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { isAdmin } from '@/lib/rbac';
import { useTenant } from '@/lib/tenant-context';
import { useUpdateFeatures } from '@/hooks/use-features';
import type { TenantFeatures } from '@/types/tenant';

interface FeatureDef {
  key: keyof TenantFeatures;
  label: string;
  description: string;
  icon: string;
  warn?: string;
}

const FEATURES: FeatureDef[] = [
  {
    key: 'aiTutor',
    label: 'AI Зөвлөгч',
    description: 'Ollama-д суурилсан AI туторинг — оюутнууд дотоод чатбот ашиглан асуулт асуух боломжтой.',
    icon: '🤖',
    warn: 'Ollama сервис ажиллаж байх шаардлагатай.',
  },
  {
    key: 'wallet',
    label: 'Хэтэвч систем',
    description: 'Хэрэглэгчид хэтэвч эзэмшиж, орлого хуримтлуулах, гаргалт хийх боломжтой.',
    icon: '💳',
  },
  {
    key: 'certificates',
    label: 'Гэрчилгээ',
    description: 'Сургалт дуусгасан оюутнуудад автоматаар PDF гэрчилгээ үүсгэж, QR кодоор баталгаажуулна.',
    icon: '🏆',
  },
  {
    key: 'gamification',
    label: 'Геймификаци',
    description: 'Оноо, дэвшил, шагнал зэрэг тоглоомын элементүүдийг суралцах явцад нэмэх.',
    icon: '🎮',
    warn: 'Одоогоор хэрэгжилтийн явцад байгаа.',
  },
  {
    key: 'liveClasses',
    label: 'Live Хичээл',
    description: 'Багш болон оюутнуудын хооронд шууд видео хичээл явуулах боломж.',
    icon: '📹',
    warn: 'Видео сервис (WebRTC) тохируулах шаардлагатай.',
  },
];

export default function AdminFeaturesPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: me, isLoading: meLoading } = useMe();
  const tenant = useTenant();
  const updateFeatures = useUpdateFeatures();

  const [features, setFeatures] = useState<TenantFeatures>({ ...tenant.features });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFeatures({ ...tenant.features });
  }, [tenant.features]);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!meLoading && me && !isAdmin(me.role)) router.replace('/dashboard');
  }, [me, meLoading, router]);

  if (!isAuthenticated || meLoading) return null;
  if (me && !isAdmin(me.role)) return null;

  const toggle = (key: keyof TenantFeatures) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
    setSuccess(false);
    setError('');
  };

  const handleSave = () => {
    setSuccess(false);
    setError('');
    updateFeatures.mutate(features, {
      onSuccess: () => setSuccess(true),
      onError: (e: Error) => setError(e.message),
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              ← Админ
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-900">Функц тохиргоо</span>
          </div>
          <button
            onClick={handleSave}
            disabled={updateFeatures.isPending}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {updateFeatures.isPending ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Функц тохиргоо</h1>
          <p className="text-sm text-gray-500 mt-1">
            Байгууллагын платформд идэвхжүүлэх функцуудыг сонгоно уу.
          </p>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
            Функц тохиргоо амжилттай хадгалагдлаа.
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {FEATURES.map((feat) => {
            const enabled = features[feat.key];
            return (
              <div
                key={feat.key}
                className={`bg-white rounded-xl border p-5 transition-all ${
                  enabled ? 'border-indigo-200 shadow-sm' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    enabled ? 'bg-indigo-50' : 'bg-gray-50'
                  }`}>
                    {feat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{feat.label}</p>
                      {enabled ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Идэвхтэй</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Идэвхгүй</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{feat.description}</p>
                    {feat.warn && (
                      <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                        <span>⚠️</span> {feat.warn}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(feat.key)}
                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
                      enabled ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                    aria-label={`${feat.label} ${enabled ? 'идэвхгүй болгох' : 'идэвхжүүлэх'}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
          <p className="font-medium mb-1">⚠️ Анхаар</p>
          <p>
            Функц идэвхгүй болгосон тохиолдолд тухайн хуудас болон API endpoint-ууд хаагдана.
            Одоогоор ашиглаж байгаа хэрэглэгчидэд нөлөөлж болзошгүй.
          </p>
        </div>
      </main>
    </div>
  );
}
