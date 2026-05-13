'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCourse, useUpdateCourse } from '@/hooks/use-courses';
import { useMe } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import type { CourseLevel } from '@/types/course';
import { clsx } from 'clsx';

const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Анхан шатны' },
  { value: 'INTERMEDIATE', label: 'Дунд шатны' },
  { value: 'ADVANCED', label: 'Дээд шатны' },
];

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { isAuthenticated } = useAuthStore();
  const { data: user, isLoading: userLoading } = useMe();
  const { data, isLoading: loadingCourse, error: loadError } = useCourse(id);
  const updateCourse = useUpdateCourse(id);

  const course = data?.data;

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isOwner = course?.instructorId === user?.id;
  const canEdit = isOwner || isAdmin;

  // Form state — initialised once course loads
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<CourseLevel>('BEGINNER');
  const [price, setPrice] = useState('0');
  const [language, setLanguage] = useState('mn');
  const [tagsInput, setTagsInput] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [initialised, setInitialised] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Populate form when course data arrives
  useEffect(() => {
    if (course && !initialised) {
      setTitle(course.title);
      setDescription(course.description ?? '');
      setLevel(course.level);
      setPrice(String(course.price));
      setLanguage(course.language);
      setTagsInput(course.tags.join(', '));
      setThumbnail(course.thumbnail ?? '');
      setInitialised(true);
    }
  }, [course, initialised]);

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  if (userLoading || loadingCourse) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError || !course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{loadError?.message ?? 'Курс олдсонгүй'}</p>
          <Link href="/courses/manage" className="text-indigo-600 hover:underline text-sm">
            Буцах
          </Link>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Энэ курсыг засах эрх байхгүй байна.</p>
          <Link href="/courses/manage" className="text-indigo-600 hover:underline text-sm">
            Буцах
          </Link>
        </div>
      </div>
    );
  }

  const isDirty =
    title !== course.title ||
    description !== (course.description ?? '') ||
    level !== course.level ||
    price !== String(course.price) ||
    language !== course.language ||
    tagsInput !== course.tags.join(', ') ||
    thumbnail !== (course.thumbnail ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!title.trim()) { setError('Гарчиг оруулна уу'); return; }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    updateCourse.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        level,
        price: price || '0',
        tags,
        language: language.trim() || 'mn',
        thumbnail: thumbnail.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  const statusColors = {
    DRAFT: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ARCHIVED: 'bg-orange-50 text-orange-700 border-orange-200',
  } as const;
  const statusLabels = { DRAFT: 'Ноорог', PUBLISHED: 'Нийтлэгдсэн', ARCHIVED: 'Архив' } as const;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/courses/manage" className="text-slate-400 hover:text-slate-700 text-sm whitespace-nowrap">
              ← Удирдах
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-600 truncate">{course.title}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium', statusColors[course.status])}>
              {statusLabels[course.status]}
            </span>
            <Link
              href={`/courses/${id}`}
              target="_blank"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Харах ↗
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-slate-900">Курс засах</h1>
          {isDirty && (
            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full">
              Хадгалаагүй өөрчлөлт байна
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Гарчиг <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={clsx(
                'w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
                !title.trim() && error ? 'border-red-400 bg-red-50' : 'border-slate-300',
              )}
              maxLength={200}
            />
            <p className="text-xs text-slate-400 mt-1">{title.length}/200</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Тайлбар</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Сурагчид юу сурах вэ?"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              maxLength={2000}
            />
            <p className="text-xs text-slate-400 mt-1">{description.length}/2000</p>
          </div>

          {/* Level + Language */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Түвшин</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as CourseLevel)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Хэл</label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="mn"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={10}
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Үнэ (₮)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₮</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                step="100"
                className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {Number(price) === 0 && (
              <p className="text-xs text-emerald-600 mt-1">Үнэгүй курс</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Шошгууд</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="javascript, web, frontend (таслалаар тусгаарлана)"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {tagsInput.trim() && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tagsInput.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                  <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Зургийн URL</label>
            <input
              type="url"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {thumbnail && (
              <div className="mt-2 w-24 h-16 rounded-lg overflow-hidden border border-slate-200">
                <img
                  src={thumbnail}
                  alt="preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          {/* Read-only info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Мэдээлэл</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoItem label="Нийт хичээл" value={String(course.totalLessons)} />
              <InfoItem label="Нийт минут" value={String(course.totalMinutes)} />
              <InfoItem label="Хувийн ID" value={course.id.slice(0, 8) + '...'} />
              <InfoItem
                label="Үүсгэсэн"
                value={new Date(course.createdAt).toLocaleDateString('mn-MN')}
              />
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
              <span>✓</span> Амжилттай хадгаллаа
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
            <button
              type="submit"
              disabled={updateCourse.isPending || !isDirty}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updateCourse.isPending ? 'Хадгалж байна...' : 'Хадгалах'}
            </button>
            <Link
              href="/courses/manage"
              className="px-6 py-2.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Цуцлах
            </Link>
            <Link
              href={`/courses/${id}/manage`}
              className="px-6 py-2.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Контент удирдах
            </Link>
            <div className="flex-1" />
            <Link
              href={`/courses/${id}`}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Курсыг харах →
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-700 text-xs">{value}</p>
    </div>
  );
}
