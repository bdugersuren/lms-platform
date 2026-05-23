'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { clsx } from 'clsx';
import { useCourse } from '@/hooks/use-courses';
import { useInteractiveBlocks } from '@/hooks/use-blocks';
import { useMe } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { useEnrollmentByCourse, useSubmitBlockAnswers } from '@/hooks/use-enrollment';
import type { AnswerItem } from '@/hooks/use-enrollment';
import type { CourseModule, InteractiveBlock, Lesson, LessonType } from '@/types/course';
import type { LessonProgress } from '@/hooks/use-enrollment';

import { VideoPlayer } from '@/components/lesson-viewer/video-player';
import { PdfViewer } from '@/components/lesson-viewer/pdf-viewer';
import { MarkdownView } from '@/components/lesson-viewer/markdown-view';
import { BlockQuiz } from '@/components/lesson-viewer/block-quiz';
import { LessonCompletionButton } from '@/components/lesson-viewer/lesson-completion-button';
import { CourseCompletionModal } from '@/components/lesson-viewer/course-completion-modal';

// ─── Lesson type meta ─────────────────────────────────────────────────────────

const LESSON_TYPE_ICON: Record<LessonType, string> = {
  VIDEO: '🎬',
  PDF: '📄',
  MARKDOWN: '📝',
  TEXT: '📖',
  LIVE: '🔴',
  QUIZ: '✅',
};

const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  VIDEO: 'Видео',
  PDF: 'PDF',
  MARKDOWN: 'Markdown',
  TEXT: 'Текст',
  LIVE: 'Шууд',
  QUIZ: 'Тест',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LessonViewerPage() {
  const params = useParams();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const { isAuthenticated } = useAuthStore();
  const { data: user } = useMe();
  const { data: courseData, isLoading, error } = useCourse(courseId);
  const { data: blocksData, isLoading: blocksLoading } = useInteractiveBlocks(lessonId);
  const { data: enrollment } = useEnrollmentByCourse(isAuthenticated ? courseId : null);
  const { mutateAsync: submitBlockAnswers } = useSubmitBlockAnswers();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const course = courseData?.data;
  const blocks = blocksData?.data ?? [];
  const lessonProgresses = enrollment?.lessonProgresses ?? [];

  // Flatten all lessons for navigation
  const allLessons: Array<{ lesson: Lesson; moduleTitle: string; moduleIdx: number }> = [];
  course?.modules.forEach((mod, mi) => {
    mod.lessons.forEach((l) => allLessons.push({ lesson: l, moduleTitle: mod.title, moduleIdx: mi }));
  });

  const currentEntry = allLessons.find((e) => e.lesson.id === lessonId);
  const lesson = currentEntry?.lesson;
  const currentIdx = allLessons.findIndex((e) => e.lesson.id === lessonId);
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1].lesson : null;
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1].lesson : null;
  const isLastLesson = currentIdx === allLessons.length - 1;

  const isOwner = course?.instructorId === user?.id;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isInstructor = user?.role === 'INSTRUCTOR';
  const isPreviewMode = isOwner || isAdmin || isInstructor;

  const currentProgress = lessonProgresses.find((lp) => lp.lessonId === lessonId);

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error?.message ?? 'Курс олдсонгүй'}</p>
          <Link href="/courses" className="text-indigo-600 hover:underline text-sm">Буцах</Link>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Хичээл олдсонгүй</p>
          <Link href={`/courses/${courseId}`} className="text-indigo-600 hover:underline text-sm">
            Курс руу буцах
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Top header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href={`/courses/${courseId}`}
            className="text-slate-400 hover:text-slate-700 text-sm transition-colors whitespace-nowrap"
          >
            ← Курс
          </Link>
          <span className="text-slate-300 hidden sm:block">/</span>
          <span className="text-sm text-slate-500 truncate hidden sm:block max-w-xs">{course.title}</span>
          <span className="text-slate-300 hidden sm:block">/</span>
          <span className="text-sm font-medium text-slate-800 truncate">{lesson.title}</span>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {isPreviewMode && (
              <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                PREVIEW
              </span>
            )}
            {isOwner || isAdmin ? (
              <Link
                href={`/courses/${courseId}/lessons/${lessonId}/edit`}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Засах ✏
              </Link>
            ) : null}
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="lg:hidden px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              {sidebarOpen ? 'Хаах' : '☰ Жагсаалт'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-screen-2xl mx-auto w-full">
        {/* ── Main content ────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 space-y-6">
          {/* Lesson title */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{LESSON_TYPE_ICON[lesson.lessonType]}</span>
              <span className="text-xs text-slate-400 font-medium">{LESSON_TYPE_LABEL[lesson.lessonType]}</span>
              {lesson.isPreview && (
                <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full">
                  Үнэгүй
                </span>
              )}
              {lesson.estimatedMinutes && (
                <span className="text-xs text-slate-400">{lesson.estimatedMinutes} мин</span>
              )}
              {currentProgress?.completed && (
                <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  ✓ Дуусгасан
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{lesson.title}</h1>
            {lesson.description && (
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">{lesson.description}</p>
            )}
          </div>

          {/* Content renderer */}
          <LessonContent
            lesson={lesson}
            blocks={blocks}
            blocksLoading={blocksLoading}
            enrollmentId={enrollment?.id}
            onSubmitAnswers={enrollment ? async (blockId: string, answers: AnswerItem[]) => {
              await submitBlockAnswers({ enrollmentId: enrollment.id, lessonId, interactiveBlockId: blockId, answers });
            } : undefined}
          />

          {/* Navigation + completion */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {prevLesson ? (
              <Link
                href={`/courses/${courseId}/lessons/${prevLesson.id}`}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <span>←</span>
                <span className="hidden sm:inline truncate max-w-[160px]">{prevLesson.title}</span>
                <span className="sm:hidden">Өмнөх</span>
              </Link>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              {/* Completion button — зөвхөн бүртгэгдсэн сурагчдад харагдана */}
              {enrollment && !isPreviewMode && (
                <LessonCompletionButton
                  enrollmentId={enrollment.id}
                  lessonId={lessonId}
                  completed={currentProgress?.completed ?? false}
                  locked={currentProgress?.status === 'LOCKED'}
                  isLastLesson={isLastLesson}
                  onCompleted={isLastLesson ? () => setShowCompletionModal(true) : undefined}
                />
              )}

              {/* Next lesson navigation */}
              {nextLesson && (
                <Link
                  href={`/courses/${courseId}/lessons/${nextLesson.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <span className="hidden sm:inline truncate max-w-[160px]">{nextLesson.title}</span>
                  <span className="sm:hidden">Дараах</span>
                  <span>→</span>
                </Link>
              )}
            </div>
          </div>
        </main>

        {/* ── Curriculum sidebar ───────────────────────────────────────────── */}
        <aside
          className={clsx(
            'w-80 shrink-0 border-l border-slate-200 bg-white overflow-y-auto',
            'fixed inset-y-0 right-0 top-14 z-10 transition-transform lg:static lg:translate-x-0',
            sidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full',
          )}
        >
          <div className="p-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Хичээлийн жагсаалт</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentIdx + 1} / {allLessons.length} хичээл
            </p>
            {enrollment && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Явц</span>
                  <span>{enrollment.progressPercent}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${enrollment.progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <CurriculumSidebar
            modules={course.modules}
            currentLessonId={lessonId}
            courseId={courseId}
            lessonProgresses={lessonProgresses}
          />
        </aside>
      </div>

      {showCompletionModal && (
        <CourseCompletionModal
          courseId={courseId}
          courseTitle={course.title}
          onClose={() => setShowCompletionModal(false)}
        />
      )}
    </div>
  );
}

// ─── Lesson content router ────────────────────────────────────────────────────

function LessonContent({
  lesson,
  blocks,
  blocksLoading,
  onSubmitAnswers,
}: {
  lesson: Lesson;
  blocks: InteractiveBlock[];
  blocksLoading: boolean;
  enrollmentId?: string;
  onSubmitAnswers?: (blockId: string, answers: AnswerItem[]) => Promise<void>;
}) {
  const spinner = (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (lesson.lessonType === 'VIDEO') {
    if (!lesson.contentUrl) return <EmptyContent message="Видео URL тохируулаагүй байна" />;
    return blocksLoading ? spinner : <VideoPlayer url={lesson.contentUrl} blocks={blocks} />;
  }

  if (lesson.lessonType === 'PDF') {
    if (!lesson.contentUrl) return <EmptyContent message="PDF URL тохируулаагүй байна" />;
    return blocksLoading ? spinner : <PdfViewer url={lesson.contentUrl} blocks={blocks} />;
  }

  if (lesson.lessonType === 'LIVE') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="font-semibold text-slate-800">Шууд дамжуулалт</span>
        </div>
        {lesson.contentUrl ? (
          <a
            href={lesson.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
          >
            🔴 Шууд нэвтрэлт нээх ↗
          </a>
        ) : (
          <p className="text-slate-400 text-sm">Шууд дамжуулалтын холбоос тохируулаагүй байна</p>
        )}
        {!blocksLoading && blocks.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            {blocks.map((b) => (
              <BlockQuiz key={b.id} block={b} onComplete={() => {}} onSubmitAnswers={onSubmitAnswers} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (lesson.lessonType === 'MARKDOWN') {
    if (!lesson.rawMarkdown) return <EmptyContent message="Markdown контент байхгүй байна" />;
    return blocksLoading ? spinner : (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
        <MarkdownView content={lesson.rawMarkdown} blocks={blocks} />
      </div>
    );
  }

  if (lesson.lessonType === 'TEXT') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8 space-y-6">
        {lesson.rawText ? (
          <div className="prose-sm max-w-none">
            {lesson.rawText.split('\n\n').map((para, i) => (
              <p key={i} className="mb-4 text-slate-700 leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        ) : (
          <EmptyContent message="Текст контент байхгүй байна" />
        )}
        {!blocksLoading && blocks.length > 0 && (
          <div className="space-y-4 border-t border-slate-100 pt-6">
            {blocks.map((b) => (
              <BlockQuiz key={b.id} block={b} onComplete={() => {}} onSubmitAnswers={onSubmitAnswers} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (lesson.lessonType === 'QUIZ') {
    if (blocksLoading) return spinner;
    if (blocks.length === 0) {
      return <EmptyContent message="Тест блок тохируулаагүй байна. Хичээл засварт интерактив блок нэмнэ үү." />;
    }
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium">
          ✅ Тест горим — {blocks.length} блок
        </div>
        {blocks.map((b, i) => (
          <div key={b.id} className="space-y-2">
            {blocks.length > 1 && (
              <p className="text-xs text-slate-400 font-medium">Блок {i + 1} / {blocks.length}</p>
            )}
            <BlockQuiz block={b} onComplete={() => {}} />
          </div>
        ))}
      </div>
    );
  }

  return <EmptyContent message="Хичээлийн төрөл тодорхойгүй байна" />;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyContent({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center py-16 text-center px-6">
      <span className="text-5xl mb-4">📭</span>
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}

// ─── Curriculum sidebar ───────────────────────────────────────────────────────

const LESSON_ICON: Record<LessonType, string> = {
  VIDEO: '🎬',
  PDF: '📄',
  MARKDOWN: '📝',
  TEXT: '📖',
  LIVE: '🔴',
  QUIZ: '✅',
};

function CurriculumSidebar({
  modules,
  currentLessonId,
  courseId,
  lessonProgresses,
}: {
  modules: CourseModule[];
  currentLessonId: string;
  courseId: string;
  lessonProgresses: LessonProgress[];
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const getProgress = (lessonId: string) =>
    lessonProgresses.find((lp) => lp.lessonId === lessonId);

  return (
    <div className="divide-y divide-slate-100">
      {modules.map((mod, mi) => (
        <div key={mod.id}>
          <button
            onClick={() => toggle(mod.id)}
            className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="text-xs text-slate-400 w-5">{mi + 1}</span>
            <span className="flex-1 text-sm font-medium text-slate-700 text-left">{mod.title}</span>
            <span className="text-slate-300 text-xs">{collapsed.has(mod.id) ? '▶' : '▼'}</span>
          </button>

          {!collapsed.has(mod.id) && (
            <div className="bg-slate-50/50">
              {mod.lessons.map((lesson) => {
                const isCurrent = lesson.id === currentLessonId;
                const progress = getProgress(lesson.id);
                const isCompleted = progress?.completed ?? false;
                const isLocked = progress?.status === 'LOCKED';

                return (
                  <Link
                    key={lesson.id}
                    href={isLocked ? '#' : `/courses/${courseId}/lessons/${lesson.id}`}
                    onClick={(e: React.MouseEvent) => isLocked && e.preventDefault()}
                    className={clsx(
                      'flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-l-2',
                      isCurrent
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                        : isLocked
                        ? 'border-transparent text-slate-400 cursor-not-allowed'
                        : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800',
                    )}
                  >
                    <span className="text-base shrink-0">{LESSON_ICON[lesson.lessonType]}</span>
                    <span className="flex-1 leading-snug line-clamp-2">{lesson.title}</span>
                    {lesson.estimatedMinutes && !isCompleted && !isLocked && (
                      <span className="text-xs text-slate-400 shrink-0">{lesson.estimatedMinutes}м</span>
                    )}
                    {isCompleted && (
                      <span className="text-xs text-emerald-500 shrink-0 font-medium">✓</span>
                    )}
                    {isLocked && !isCompleted && (
                      <span className="text-xs text-slate-400 shrink-0">🔒</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
