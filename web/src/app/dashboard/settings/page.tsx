'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useMyProfile, useUpdateProfile } from '@/hooks/use-profile';
import { Avatar } from '@/components/user/avatar';

export default function SettingsPage() {
  const { data: profile, isLoading } = useMyProfile();
  const update = useUpdateProfile();

  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [expertiseInput, setExpertiseInput] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? '');
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setHeadline(profile.headline ?? '');
      setBio(profile.bio ?? '');
      setAvatarUrl(profile.avatarUrl ?? '');
      setExpertiseInput((profile.expertise ?? []).join(', '));
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setErrorMsg('');

    const expertise = expertiseInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    update.mutate(
      { displayName, firstName, lastName, headline, bio, avatarUrl, expertise },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        },
        onError: (err) => {
          setErrorMsg(err.message ?? 'Алдаа гарлаа');
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-lg">👤</span>
          <h1 className="font-semibold text-gray-900 text-sm">Профайл тохиргоо</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar preview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Профайл зураг</h2>
              <div className="flex items-center gap-4">
                <Avatar
                  avatarUrl={avatarUrl || null}
                  displayName={displayName || 'U'}
                  size="lg"
                />
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Зургийн URL
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Зургийн шууд URL оруулна уу</p>
                </div>
              </div>
            </div>

            {/* Basic info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Үндсэн мэдээлэл</h2>

              <Field label="Дэлгэцийн нэр *">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Овог">
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </Field>
                <Field label="Нэр">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </Field>
              </div>

              <Field label="Гарчиг (headline)">
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Жишээ: Frontend Developer | React Багш"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </Field>

              <Field label="Танилцуулга">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Өөрийнхөө тухай товч тайлбар..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </Field>

              <Field label="Мэргэжлийн чиглэл (таслалаар тусгаарлана)">
                <input
                  type="text"
                  value={expertiseInput}
                  onChange={(e) => setExpertiseInput(e.target.value)}
                  placeholder="Жишээ: JavaScript, React, NestJS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </Field>
            </div>

            {/* Feedback */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-center gap-2">
                <span>✓</span> Профайл амжилттай хадгалагдлаа
              </div>
            )}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
                <span>✕</span> {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={update.isPending}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {update.isPending ? 'Хадгалж байна...' : 'Хадгалах'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
