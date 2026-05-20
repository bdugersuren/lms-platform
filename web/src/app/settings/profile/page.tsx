'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import { useMe } from '@/hooks/use-auth';
import { useMyProfile, useUpdateProfile, useProfileCompletion } from '@/hooks/use-profile';
import { Avatar } from '@/components/user/avatar';
import { FileUpload } from '@/components/file-upload';
import { OnboardingChecklist } from '@/components/profile/onboarding-checklist';
import { isCertificateReady } from '@/lib/profile-completion';
import { track, AnalyticsEvents } from '@/lib/analytics';
import { isInstructor, isAdmin } from '@/lib/rbac';

const LOCALES = [
  { value: 'mn', label: 'Монгол' },
  { value: 'en', label: 'English' },
];

const LEARNING_GOALS = [
  { value: 'career_change',    label: 'Мэргэжил өөрчлөх' },
  { value: 'skill_upgrade',    label: 'Мэдлэг дэвшүүлэх' },
  { value: 'certification',    label: 'Гэрчилгээ авах' },
  { value: 'personal_growth',  label: 'Хувийн хөгжил' },
  { value: 'academic',         label: 'Академик судалгаа' },
];

export default function ProfileSettingsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: me } = useMe();
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const completion = useProfileCompletion(me);

  const showInstructorSection = !!me && (isInstructor(me.role) || isAdmin(me.role));
  const showStudentSection    = !!me && me.role === 'STUDENT';

  // Form state
  const [displayName,   setDisplayName]   = useState('');
  const [firstName,     setFirstName]     = useState('');
  const [lastName,      setLastName]      = useState('');
  const [bio,           setBio]           = useState('');
  const [locale,        setLocale]        = useState('mn');
  const [avatarUrl,     setAvatarUrl]     = useState('');
  const [headline,      setHeadline]      = useState('');
  const [expertiseRaw,  setExpertiseRaw]  = useState('');  // comma-separated input
  const [learningGoals, setLearningGoals] = useState<string[]>([]);
  const [success,       setSuccess]       = useState(false);
  const [error,         setError]         = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? '');
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setBio(profile.bio ?? '');
      setLocale(profile.locale ?? 'mn');
      setAvatarUrl(profile.avatarUrl ?? '');
      setHeadline(profile.headline ?? '');
      setExpertiseRaw(profile.expertise?.join(', ') ?? '');
      setLearningGoals(profile.learningGoals ?? []);
    }
  }, [profile]);

  if (!isAuthenticated) return null;

  const handleAvatarChange = (url: string) => setAvatarUrl(url);

  const certCheck = me && profile
    ? isCertificateReady({ displayName, firstName, lastName }, me.email)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!displayName.trim()) {
      setError('Нэр оруулна уу');
      return;
    }
    if (displayName.length > 100) {
      setError('Нэр 100 тэмдэгтээс хэтрэхгүй байна');
      return;
    }
    if (bio.length > 500) {
      setError('Товч мэдээлэл 500 тэмдэгтээс хэтрэхгүй байна');
      return;
    }
    if (headline.length > 160) {
      setError('Мэргэжлийн гарчиг 160 тэмдэгтээс хэтрэхгүй байна');
      return;
    }

    const expertise = expertiseRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    const prevScore = completion?.score ?? 0;

    updateProfile.mutate(
      {
        displayName,
        firstName: firstName || undefined,
        lastName:  lastName  || undefined,
        bio,
        locale,
        avatarUrl: avatarUrl || undefined,
        ...(showInstructorSection && {
          headline:  headline  || undefined,
          expertise,
        }),
        ...(showStudentSection && { learningGoals }),
      },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
          track(AnalyticsEvents.PROFILE_UPDATED, {
            role:      me?.role,
            prevScore,
          });
        },
        onError: () => {
          setError('Хадгалахад алдаа гарлаа. Дахин оролдоно уу.');
        },
      },
    );
  };

  const toggleGoal = (value: string) => {
    setLearningGoals((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value],
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          ← Хяналтын самбар руу буцах
        </Link>

        <div className="flex items-start justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Профайл тохиргоо</h1>
          {completion && (
            <div className="text-right">
              <span className="text-2xl font-bold text-indigo-600">{completion.score}%</span>
              <p className="text-xs text-gray-500">дүүрсэн</p>
            </div>
          )}
        </div>

        {/* Onboarding checklist (collapsed when complete) */}
        {completion && !completion.isComplete && (
          <div className="bg-white border border-indigo-100 rounded-xl px-5 py-4 mb-6">
            <OnboardingChecklist completion={completion} locale="mn" compact={false} />
          </div>
        )}

        {/* Avatar section */}
        <div id="avatar" className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Профайл зураг</h2>
          <div className="flex items-center gap-6 mb-4">
            {isLoading ? (
              <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
            ) : (
              <Avatar avatarUrl={avatarUrl} displayName={displayName || 'U'} size="lg" />
            )}
            <p className="text-sm text-gray-500">JPEG, PNG, WebP — дээд тал нь 5MB</p>
          </div>
          <FileUpload
            accept="image"
            value={avatarUrl}
            onChange={handleAvatarChange}
            label="Зураг оруулах"
            maxMb={5}
          />
        </div>

        {/* Main profile form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Basic info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-700">Хувийн мэдээлэл</h2>

            {/* Display name + certificate warning */}
            <div id="display-name">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Харагдах нэр <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                placeholder="Жишээ: Батбаяр Болд"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {/* Real-time certificate readiness warning */}
              {certCheck && !certCheck.ready && displayName.trim().length > 0 && (
                <p className="mt-1.5 text-xs text-amber-700 flex items-start gap-1">
                  <span className="mt-0.5">⚠</span>
                  <span>{certCheck.blocker}</span>
                </p>
              )}
              {certCheck?.ready && (
                <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                  <span>✓</span>
                  Гэрчилгээнд бэлэн
                </p>
              )}
            </div>

            {/* Full name */}
            <div id="full-name" className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Овог</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={60}
                  placeholder="Жишээ: Болд"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Нэр</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={60}
                  placeholder="Жишээ: Батбаяр"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Bio */}
            <div id="bio">
              <label className="block text-sm font-medium text-gray-700 mb-1">Товч мэдээлэл</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Өөрийгөө товч танилцуулна уу..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/500</p>
            </div>

            {/* Locale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Хэл</label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {LOCALES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Instructor section */}
          {showInstructorSection && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">Багшийн профайл</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Энэ мэдээлэл курсын хуудас болон олон нийтэд харагдана
                </p>
              </div>

              {/* Headline */}
              <div id="headline">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Мэргэжлийн гарчиг
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  maxLength={160}
                  placeholder="Жишээ: Full-Stack хөгжүүлэгч · 10 жилийн туршлагатай"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{headline.length}/160</p>
              </div>

              {/* Expertise */}
              <div id="expertise">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Мэдлэгийн чиглэл
                </label>
                <input
                  type="text"
                  value={expertiseRaw}
                  onChange={(e) => setExpertiseRaw(e.target.value)}
                  placeholder="Жишээ: JavaScript, React, Node.js (таслалаар тусга)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* Tag preview */}
                {expertiseRaw.trim() && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {expertiseRaw.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 10).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">Дээд тал нь 10 чиглэл</p>
              </div>
            </div>
          )}

          {/* Student section */}
          {showStudentSection && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">Суралцах зорилго</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Танд хамааралтай контент санал болгоход ашиглана
                </p>
              </div>

              <div id="learning-goals" className="space-y-2">
                {LEARNING_GOALS.map((goal) => (
                  <label
                    key={goal.value}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                      learningGoals.includes(goal.value)
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={learningGoals.includes(goal.value)}
                      onChange={() => toggleGoal(goal.value)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{goal.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              ✓ Профайл амжилттай хадгалагдлаа
            </div>
          )}

          <button
            type="submit"
            disabled={updateProfile.isPending || isLoading}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateProfile.isPending ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </form>
      </div>
    </div>
  );
}
