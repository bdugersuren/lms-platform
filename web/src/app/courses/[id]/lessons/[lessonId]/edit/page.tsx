'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCourse } from '@/hooks/use-courses';
import { useMe } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { useUpdateLesson } from '@/hooks/use-modules';
import { FileUpload } from '@/components/file-upload';
import { InteractiveBlocksEditor } from '@/components/interactive-blocks-editor';
import type { LessonType } from '@/types/course';

// ─── Constants ────────────────────────────────────────────────────────────────

const LESSON_TYPES: { value: LessonType; label: string }[] = [
  { value: 'VIDEO', label: 'Видео' },
  { value: 'PDF', label: 'PDF' },
  { value: 'MARKDOWN', label: 'Markdown' },
  { value: 'TEXT', label: 'Текст' },
  { value: 'LIVE', label: 'Шууд' },
  { value: 'QUIZ', label: 'Тест' },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LessonEditPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const { isAuthenticated } = useAuthStore();
  const { data: user, isLoading: userLoading } = useMe();
  const { data: courseData, isLoading: courseLoading, error: courseError } = useCourse(courseId);

  // Find lesson and moduleId from course data
  const course = courseData?.data;
  const allLessons = course?.modules.flatMap((m) => m.lessons) ?? [];
  const lesson = allLessons.find((l) => l.id === lessonId);
  const moduleId = lesson?.moduleId ?? '';

  const updateLesson = useUpdateLesson(courseId, moduleId, lessonId);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isOwner = course?.instructorId === user?.id;
  const canAccess = isOwner || isAdmin;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lessonType, setLessonType] = useState<LessonType>('VIDEO');
  const [sortOrder, setSortOrder] = useState('1');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [passingScore, setPassingScore] = useState('0');
  const [unlockNextOnPass, setUnlockNextOnPass] = useState(false);
  const [contentUrl, setContentUrl] = useState('');
  const [rawMarkdown, setRawMarkdown] = useState('');
  const [rawText, setRawText] = useState('');
  const [initialised, setInitialised] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    if (lesson && !initialised) {
      setTitle(lesson.title);
      setDescription(lesson.description ?? '');
      setLessonType(lesson.lessonType);
      setSortOrder(String(lesson.sortOrder));
      setEstimatedMinutes(lesson.estimatedMinutes != null ? String(lesson.estimatedMinutes) : '');
      setIsPreview(lesson.isPreview);
      setPassingScore(String(lesson.passingScore));
      setUnlockNextOnPass(lesson.unlockNextOnPass);
      setContentUrl(lesson.contentUrl ?? '');
      setRawMarkdown(lesson.rawMarkdown ?? '');
      setRawText(lesson.rawText ?? '');
      setInitialised(true);
    }
  }, [lesson, initialised]);

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  if (userLoading || courseLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (courseError || !course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{courseError?.message ?? 'Курс олдсонгүй'}</p>
          <Link href={`/courses/${courseId}/manage`} className="text-indigo-600 hover:underline text-sm">
            Буцах
          </Link>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Энэ хичээлийг засах эрх байхгүй байна.</p>
          <Link href={`/courses/${courseId}/manage`} className="text-indigo-600 hover:underline text-sm">
            Буцах
          </Link>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Хичээл олдсонгүй</p>
          <Link href={`/courses/${courseId}/manage`} className="text-indigo-600 hover:underline text-sm">
            Буцах
          </Link>
        </div>
      </div>
    );
  }

  const isDirty =
    title !== lesson.title ||
    description !== (lesson.description ?? '') ||
    lessonType !== lesson.lessonType ||
    sortOrder !== String(lesson.sortOrder) ||
    estimatedMinutes !== (lesson.estimatedMinutes != null ? String(lesson.estimatedMinutes) : '') ||
    isPreview !== lesson.isPreview ||
    passingScore !== String(lesson.passingScore) ||
    unlockNextOnPass !== lesson.unlockNextOnPass ||
    contentUrl !== (lesson.contentUrl ?? '') ||
    rawMarkdown !== (lesson.rawMarkdown ?? '') ||
    rawText !== (lesson.rawText ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);
    if (!title.trim()) { setFormError('Гарчиг оруулна уу'); return; }
    updateLesson.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        lessonType,
        sortOrder: sortOrder ? Number(sortOrder) : lesson.sortOrder,
        estimatedMinutes: estimatedMinutes !== '' ? Number(estimatedMinutes) : null,
        isPreview,
        passingScore: passingScore !== '' ? Number(passingScore) : 0,
        unlockNextOnPass,
        contentUrl: contentUrl.trim() || null,
        rawMarkdown: rawMarkdown || null,
        rawText: rawText || null,
      },
      {
        onSuccess: () => {
          setFormSuccess(true);
          setInitialised(false);
          setTimeout(() => setFormSuccess(false), 3000);
        },
        onError: (e) => setFormError(e.message),
      },
    );
  };

  const needsUrl = lessonType === 'VIDEO' || lessonType === 'PDF' || lessonType === 'LIVE';
  const needsMarkdown = lessonType === 'MARKDOWN';
  const needsText = lessonType === 'TEXT';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 text-sm">
            <Link
              href={`/courses/${courseId}/manage`}
              className="text-slate-400 hover:text-slate-700 whitespace-nowrap"
            >
              ← Контент
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 truncate hidden sm:block">{course.title}</span>
            <span className="text-slate-300 hidden sm:block">/</span>
            <span className="font-medium text-slate-700 truncate">{lesson.title}</span>
          </div>
          <div className="shrink-0">
            {isDirty && (
              <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full">
                Хадгалаагүй өөрчлөлт
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Section 1: Lesson content form */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-6">Хичээлийн мэдээлэл</h2>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Гарчиг <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={200}
                required
              />
              <p className="text-xs text-slate-400 mt-1">{title.length}/200</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Тайлбар</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                maxLength={500}
                placeholder="Хичээлийн тайлбар"
              />
              <p className="text-xs text-slate-400 mt-1">{description.length}/500</p>
            </div>

            {/* Lesson type + sort order */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Хичээлийн төрөл</label>
                <select
                  value={lessonType}
                  onChange={(e) => setLessonType(e.target.value as LessonType)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {LESSON_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Дэс дугаар</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="1"
                />
              </div>
            </div>

            {/* Estimated minutes + isPreview */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Хугацаа (мин)</label>
                <input
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Тооцоолсон минут"
                  min="1"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPreview}
                    onChange={(e) => setIsPreview(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                  />
                  <span className="text-sm font-medium text-slate-700">Үнэгүй харах</span>
                </label>
              </div>
            </div>

            {/* Passing score + unlockNextOnPass */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Дараагийг нээх оноо (0-100)
                </label>
                <input
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="0"
                  max="100"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={unlockNextOnPass}
                    onChange={(e) => setUnlockNextOnPass(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                  />
                  <span className="text-sm font-medium text-slate-700">Дааврыг биелүүлбэл дараагийг нээх</span>
                </label>
              </div>
            </div>

            {/* Content field based on lesson type */}
            {needsUrl && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Контентийн URL</label>
                <input
                  type="url"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                />
              </div>
            )}

            {needsMarkdown && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Markdown контент</label>
                <textarea
                  value={rawMarkdown}
                  onChange={(e) => setRawMarkdown(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y"
                  placeholder="# Гарчиг&#10;&#10;Контентоо энд бичнэ үү..."
                />
              </div>
            )}

            {needsText && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Текст контент</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={15}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                  placeholder="Хичээлийн текст контент..."
                />
              </div>
            )}

            {lessonType === 'QUIZ' && (
              <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                Хичээлийн контент нь интерактив блокуудаас бүрдэнэ
              </div>
            )}

            {/* Feedback */}
            {formError && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
                <span>✓</span> Амжилттай хадгаллаа
              </div>
            )}

            {/* Save button */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={updateLesson.isPending || !isDirty}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateLesson.isPending ? 'Хадгалж байна...' : 'Хадгалах'}
              </button>
              <Link
                href={`/courses/${courseId}/manage`}
                className="px-6 py-2.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Буцах
              </Link>
            </div>
          </form>
        </section>

        {/* Section 2: Interactive blocks */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-900">Интерактив блокууд</h2>
            {!addingBlock && (
              <button
                onClick={() => setAddingBlock(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                + Блок нэмэх
              </button>
            )}
          </div>

          {blocksLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {sortedBlocks.length === 0 && !addingBlock && (
                <p className="text-sm text-slate-400 text-center py-6">
                  Интерактив блок байхгүй байна
                </p>
              )}
              {sortedBlocks.map((block) => (
                <BlockCard key={block.id} block={block} lessonId={lessonId} />
              ))}
              {addingBlock && (
                <AddBlockForm lessonId={lessonId} onClose={() => setAddingBlock(false)} />
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
