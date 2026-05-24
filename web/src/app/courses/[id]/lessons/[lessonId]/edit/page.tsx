'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCourse } from '@/hooks/use-courses';
import { useMe } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { useUpdateLesson } from '@/hooks/use-modules';
import { FileUpload } from '@/components/file-upload';
import { InteractiveBlocksEditor } from '@/components/interactive-blocks-editor';
import { MarkdownView } from '@/components/lesson-viewer/markdown-view';
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
  const [mdTab, setMdTab] = useState<'edit' | 'preview'>('edit');

  // Track previous contentUrl to detect upload-driven changes
  const prevContentUrlRef = useRef<string>('');

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
      const initialUrl = lesson.contentUrl ?? '';
      setContentUrl(initialUrl);
      prevContentUrlRef.current = initialUrl;
      setRawMarkdown(lesson.rawMarkdown ?? '');
      setRawText(lesson.rawText ?? '');
      setInitialised(true);
    }
  }, [lesson, initialised]);

  // Auto-save when a new file is uploaded (contentUrl changes to a non-empty value)
  const autoSaveUpload = useCallback(() => {
    if (
      !initialised ||
      !title.trim() ||
      !contentUrl ||
      contentUrl === prevContentUrlRef.current ||
      (lessonType !== 'VIDEO' && lessonType !== 'PDF')
    ) return;
    prevContentUrlRef.current = contentUrl;
    updateLesson.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        lessonType,
        sortOrder: lesson ? Number(sortOrder) : 1,
        estimatedMinutes: estimatedMinutes !== '' ? Number(estimatedMinutes) : null,
        isPreview,
        passingScore: passingScore !== '' ? Number(passingScore) : 0,
        unlockNextOnPass,
        contentUrl: contentUrl.trim(),
        rawMarkdown: rawMarkdown || null,
        rawText: rawText || null,
      },
      {
        onSuccess: () => { setFormSuccess(true); setInitialised(false); setTimeout(() => setFormSuccess(false), 3000); },
        onError: (e) => setFormError(e.message),
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentUrl, initialised, title, lessonType]);

  useEffect(() => { autoSaveUpload(); }, [autoSaveUpload]);

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const dirty =
        title !== (lesson?.title ?? '') ||
        description !== (lesson?.description ?? '') ||
        lessonType !== (lesson?.lessonType ?? 'VIDEO') ||
        contentUrl !== (lesson?.contentUrl ?? '') ||
        rawMarkdown !== (lesson?.rawMarkdown ?? '') ||
        rawText !== (lesson?.rawText ?? '');
      if (dirty) { e.preventDefault(); }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [title, description, lessonType, contentUrl, rawMarkdown, rawText, lesson]);

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

  // Which fields are relevant per lesson type
  const showDuration   = lessonType === 'VIDEO' || lessonType === 'LIVE' || lessonType === 'QUIZ';
  const showScoring    = lessonType === 'VIDEO' || lessonType === 'PDF'  || lessonType === 'QUIZ';

  const DURATION_LABEL: Partial<Record<LessonType, string>> = {
    VIDEO: 'Видео хугацаа (мин)',
    LIVE:  'Шууд нэвтрэлтийн хугацаа (мин)',
    QUIZ:  'Тестийн хугацааны хязгаар (мин)',
  };

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
          <div className="flex items-center gap-2 shrink-0">
            {isDirty && (
              <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full">
                Хадгалаагүй өөрчлөлт
              </span>
            )}
            <Link
              href={`/courses/${courseId}/lessons/${lessonId}`}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Урьдчилан харах ▶
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-6">Хичээлийн мэдээлэл</h2>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Үндсэн мэдээлэл ──────────────────────────────────────────── */}
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

            {/* Хичээлийн төрөл + дэс дугаар + үнэгүй */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
              <div className="flex items-end pb-2">
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

            {/* ── Хугацаа — зөвхөн VIDEO / LIVE / QUIZ ──────────────────── */}
            {showDuration && (
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {DURATION_LABEL[lessonType] ?? 'Хугацаа (мин)'}
                </label>
                <input
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                  min="1"
                />
              </div>
            )}

            {/* ── Дүн тохиргоо — зөвхөн VIDEO / PDF / QUIZ ─────────────── */}
            {showScoring && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Дүн / давалгаа</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Дараагийг нээх оноо (0–100)
                  </label>
                  <input
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="flex items-end pb-2">
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
            )}

            {/* ── Контент — төрлөөс хамаарна ───────────────────────────── */}
            {lessonType === 'VIDEO' && (
              <FileUpload
                accept="video"
                value={contentUrl}
                onChange={setContentUrl}
                label="Видео файл (MP4, WebM · YouTube / Vimeo холбоос ч болно)"
                maxMb={500}
              />
            )}

            {lessonType === 'PDF' && (
              <FileUpload
                accept="pdf"
                value={contentUrl}
                onChange={setContentUrl}
                label="PDF файл"
                maxMb={100}
              />
            )}

            {lessonType === 'LIVE' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Шууд дамжуулалтын URL</label>
                <input
                  type="url"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://meet.google.com/... эсвэл Zoom холбоос"
                />
              </div>
            )}

            {lessonType === 'MARKDOWN' && (
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => setMdTab('edit')}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      mdTab === 'edit'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Засах
                  </button>
                  <button
                    type="button"
                    onClick={() => setMdTab('preview')}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      mdTab === 'preview'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Урьдчилан харах
                  </button>
                </div>
                {mdTab === 'edit' ? (
                  <textarea
                    value={rawMarkdown}
                    onChange={(e) => setRawMarkdown(e.target.value)}
                    rows={20}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y"
                    placeholder={'# Гарчиг\n\nКонтентоо энд бичнэ үү...'}
                  />
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-white p-4 min-h-[480px] overflow-auto">
                    {rawMarkdown.trim() ? (
                      <MarkdownView content={rawMarkdown} blocks={[]} />
                    ) : (
                      <p className="text-slate-400 text-sm italic">Markdown контент хоосон байна</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {lessonType === 'TEXT' && (
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
                ✅ Тестийн контент нь доорх <strong>Интерактив блокуудаас</strong> бүрдэнэ
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
        <InteractiveBlocksEditor lessonId={lessonId} />
      </main>
    </div>
  );
}
