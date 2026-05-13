'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCourse } from '@/hooks/use-courses';
import { useMe } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import {
  useModules,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useCreateLesson,
  useDeleteLesson,
} from '@/hooks/use-modules';
import type { CourseModule, Lesson, LessonType, CourseStatus } from '@/types/course';

// ─── Constants ───────────────────────────────────────────────────────────────

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  VIDEO: 'Видео',
  PDF: 'PDF',
  MARKDOWN: 'Markdown',
  TEXT: 'Текст',
  LIVE: 'Шууд',
  QUIZ: 'Тест',
};

const LESSON_TYPE_COLORS: Record<LessonType, string> = {
  VIDEO: 'bg-blue-50 text-blue-600 border-blue-100',
  PDF: 'bg-red-50 text-red-600 border-red-100',
  MARKDOWN: 'bg-purple-50 text-purple-600 border-purple-100',
  TEXT: 'bg-slate-50 text-slate-600 border-slate-200',
  LIVE: 'bg-green-50 text-green-600 border-green-100',
  QUIZ: 'bg-amber-50 text-amber-600 border-amber-100',
};

const STATUS_COLORS: Record<CourseStatus, string> = {
  DRAFT: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ARCHIVED: 'bg-orange-50 text-orange-700 border-orange-200',
};

const STATUS_LABELS: Record<CourseStatus, string> = {
  DRAFT: 'Ноорог',
  PUBLISHED: 'Нийтлэгдсэн',
  ARCHIVED: 'Архив',
};

const LESSON_TYPES: LessonType[] = ['VIDEO', 'PDF', 'MARKDOWN', 'TEXT', 'LIVE', 'QUIZ'];

// ─── Add Lesson Form ──────────────────────────────────────────────────────────

function AddLessonForm({
  courseId,
  moduleId,
  onClose,
}: {
  courseId: string;
  moduleId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [lessonType, setLessonType] = useState<LessonType>('VIDEO');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [sortOrder, setSortOrder] = useState('1');
  const [error, setError] = useState('');

  const createLesson = useCreateLesson(courseId, moduleId);

  const handleSave = () => {
    if (!title.trim()) { setError('Гарчиг оруулна уу'); return; }
    setError('');
    createLesson.mutate(
      {
        title: title.trim(),
        lessonType,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        isPreview,
        sortOrder: sortOrder ? Number(sortOrder) : 1,
      },
      {
        onSuccess: () => onClose(),
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <div className="mt-2 mb-3 ml-6 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Шинэ хичээл</p>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Гарчиг *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Хичээлийн гарчиг"
          maxLength={200}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Төрөл</label>
          <select
            value={lessonType}
            onChange={(e) => setLessonType(e.target.value as LessonType)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {LESSON_TYPES.map((t) => (
              <option key={t} value={t}>{LESSON_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Дэс дугаар</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            min="1"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Хугацаа (мин)</label>
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
            <span className="text-sm text-slate-700">Үнэгүй харах</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={createLesson.isPending}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {createLesson.isPending ? 'Хадгалж байна...' : 'Хадгалах'}
        </button>
        <button
          onClick={onClose}
          className="px-5 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
        >
          Цуцлах
        </button>
      </div>
    </div>
  );
}

// ─── Lesson Row ───────────────────────────────────────────────────────────────

function LessonRow({
  lesson,
  courseId,
  moduleId,
}: {
  lesson: Lesson;
  courseId: string;
  moduleId: string;
}) {
  const deleteLesson = useDeleteLesson(courseId, moduleId);

  const handleDelete = () => {
    if (!window.confirm(`"${lesson.title}" хичээлийг устгах уу?`)) return;
    deleteLesson.mutate(lesson.id);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-lg group">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${LESSON_TYPE_COLORS[lesson.lessonType]}`}
      >
        {LESSON_TYPE_LABELS[lesson.lessonType]}
      </span>
      <span className="flex-1 text-sm text-slate-700 truncate">{lesson.title}</span>
      {lesson.estimatedMinutes != null && (
        <span className="text-xs text-slate-400 hidden sm:block">{lesson.estimatedMinutes} мин</span>
      )}
      {lesson.isPreview && (
        <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded-full hidden sm:block">
          Үнэгүй
        </span>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/courses/${courseId}/lessons/${lesson.id}/edit`}
          className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          Засах
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleteLesson.isPending}
          className="px-2.5 py-1 text-xs bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          Устгах
        </button>
      </div>
    </div>
  );
}

// ─── Module Section ──────────────────────────────────────────────────────────

function ModuleSection({
  mod,
  index,
  courseId,
}: {
  mod: CourseModule;
  index: number;
  courseId: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);

  const [editTitle, setEditTitle] = useState(mod.title);
  const [editDescription, setEditDescription] = useState(mod.description ?? '');
  const [editUnlockScore, setEditUnlockScore] = useState(
    mod.unlockScore != null ? String(mod.unlockScore) : '',
  );
  const [editError, setEditError] = useState('');

  const updateModule = useUpdateModule(courseId, mod.id);
  const deleteModule = useDeleteModule(courseId);

  const handleEditSave = () => {
    if (!editTitle.trim()) { setEditError('Гарчиг оруулна уу'); return; }
    setEditError('');
    updateModule.mutate(
      {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        unlockScore: editUnlockScore !== '' ? Number(editUnlockScore) : null,
      },
      {
        onSuccess: () => setEditing(false),
        onError: (e) => setEditError(e.message),
      },
    );
  };

  const handleDelete = () => {
    if (!window.confirm(`"${mod.title}" модулийг устгах уу? Бүх хичээлүүд устана.`)) return;
    deleteModule.mutate(mod.id);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Module header */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-100">
        {/* Drag handle (visual only) */}
        <span className="text-slate-300 cursor-grab select-none text-lg leading-none">⠿</span>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <span className="text-xs font-semibold text-slate-400 w-5 text-center">{index + 1}</span>
          <span className="font-semibold text-slate-800 truncate text-sm">{mod.title}</span>
          <span className="text-xs bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full shrink-0">
            #{mod.sortOrder}
          </span>
          <span className="text-xs text-slate-400 shrink-0">
            {mod.lessons.length} хичээл
          </span>
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              setEditing((v) => !v);
              setEditTitle(mod.title);
              setEditDescription(mod.description ?? '');
              setEditUnlockScore(mod.unlockScore != null ? String(mod.unlockScore) : '');
              setEditError('');
            }}
            className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            Засах
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteModule.isPending}
            className="px-2.5 py-1 text-xs bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            Устгах
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="text-slate-400 hover:text-slate-600 px-1"
            aria-label="нуух"
          >
            {collapsed ? '▶' : '▼'}
          </button>
        </div>
      </div>

      {/* Inline edit form */}
      {editing && (
        <div className="px-5 py-4 border-b border-slate-100 bg-amber-50/40 space-y-3">
          {editError && <p className="text-xs text-red-500">{editError}</p>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Гарчиг *</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Тайлбар</label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Сонголтоор"
              maxLength={500}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Нээх оноо</label>
            <input
              type="number"
              value={editUnlockScore}
              onChange={(e) => setEditUnlockScore(e.target.value)}
              className="w-40 px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Сонголтоор"
              min="0"
              max="100"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEditSave}
              disabled={updateModule.isPending}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {updateModule.isPending ? 'Хадгалж байна...' : 'Хадгалах'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-5 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              Цуцлах
            </button>
          </div>
        </div>
      )}

      {/* Lessons */}
      {!collapsed && (
        <div className="p-3 space-y-0.5">
          {mod.lessons.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Хичээл байхгүй байна</p>
          ) : (
            mod.lessons
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  courseId={courseId}
                  moduleId={mod.id}
                />
              ))
          )}

          {/* Add lesson inline form */}
          {addingLesson ? (
            <AddLessonForm
              courseId={courseId}
              moduleId={mod.id}
              onClose={() => setAddingLesson(false)}
            />
          ) : (
            <button
              onClick={() => setAddingLesson(true)}
              className="mt-2 w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              + Хичээл нэмэх
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Module Form ──────────────────────────────────────────────────────────

function AddModuleForm({
  courseId,
  onClose,
}: {
  courseId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('1');
  const [error, setError] = useState('');

  const createModule = useCreateModule(courseId);

  const handleSave = () => {
    if (!title.trim()) { setError('Гарчиг оруулна уу'); return; }
    setError('');
    createModule.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        sortOrder: sortOrder ? Number(sortOrder) : 1,
      },
      {
        onSuccess: () => onClose(),
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <p className="text-sm font-semibold text-slate-700">Шинэ модуль нэмэх</p>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Гарчиг *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Модулийн гарчиг"
          maxLength={200}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Тайлбар</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Сонголтоор"
          maxLength={500}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Дэс дугаар</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="w-40 px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          min="1"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={createModule.isPending}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {createModule.isPending ? 'Хадгалж байна...' : 'Хадгалах'}
        </button>
        <button
          onClick={onClose}
          className="px-6 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
        >
          Цуцлах
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourseManageContentPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const { isAuthenticated } = useAuthStore();
  const { data: user, isLoading: userLoading } = useMe();
  const { data: courseData, isLoading: courseLoading, error: courseError } = useCourse(courseId);
  const { data: modulesData, isLoading: modulesLoading } = useModules(courseId);

  const [addingModule, setAddingModule] = useState(false);

  const course = courseData?.data;
  const modules = modulesData?.data ?? [];

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isOwner = course?.instructorId === user?.id;
  const canAccess = isOwner || isAdmin;

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
          <Link href="/courses/manage" className="text-indigo-600 hover:underline text-sm">
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
          <p className="text-slate-500 mb-4">Энэ курсыг удирдах эрх байхгүй байна.</p>
          <Link href="/courses/manage" className="text-indigo-600 hover:underline text-sm">
            Буцах
          </Link>
        </div>
      </div>
    );
  }

  const sortedModules = modules.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/courses/manage"
              className="text-slate-400 hover:text-slate-700 text-sm whitespace-nowrap"
            >
              ← Удирдах
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-700 truncate font-medium">{course.title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[course.status]}`}
            >
              {STATUS_LABELS[course.status]}
            </span>
            <Link
              href={`/courses/${courseId}/edit`}
              className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-100 bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
            >
              Засах →
            </Link>
            <Link
              href={`/courses/${courseId}`}
              target="_blank"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Харах ↗
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Контент удирдах</h1>
          <p className="text-sm text-slate-500 mt-1">Модуль болон хичээлүүдийг удирдах</p>
        </div>

        {modulesLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedModules.length === 0 && !addingModule ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-slate-500 text-sm mb-4">Модуль байхгүй байна</p>
            <button
              onClick={() => setAddingModule(true)}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Модуль нэмэх
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedModules.map((mod, index) => (
              <ModuleSection
                key={mod.id}
                mod={mod}
                index={index}
                courseId={courseId}
              />
            ))}

            {addingModule ? (
              <AddModuleForm
                courseId={courseId}
                onClose={() => setAddingModule(false)}
              />
            ) : (
              <button
                onClick={() => setAddingModule(true)}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
              >
                + Модуль нэмэх
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
