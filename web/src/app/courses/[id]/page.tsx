'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCourse, usePublishCourse, useArchiveCourse, useDeleteCourse } from '@/hooks/use-courses';
import { useAuthStore } from '@/store/auth.store';
import type { CourseModule } from '@/types/course';
import { clsx } from 'clsx';

const levelColors = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED: 'bg-red-100 text-red-700',
} as const;

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading, error } = useCourse(id);
  const publish = usePublishCourse();
  const archive = useArchiveCourse();
  const deleteCourse = useDeleteCourse();
  const { user } = useAuthStore();

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState('');

  const course = data?.data;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isOwner = course?.instructorId === user?.id;
  const canManage = isOwner || isAdmin;

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
      return next;
    });
  };

  const handlePublish = () => {
    setActionError('');
    publish.mutate(id, {
      onError: (err) => setActionError(err.message),
    });
  };

  const handleArchive = () => {
    setActionError('');
    archive.mutate(id, {
      onError: (err) => setActionError(err.message),
    });
  };

  const handleDelete = () => {
    if (!confirm('Delete this course? This action cannot be undone.')) return;
    deleteCourse.mutate(id, {
      onSuccess: () => router.push('/courses'),
      onError: (err) => setActionError(err.message),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error?.message ?? 'Course not found'}</p>
          <Link href="/courses" className="text-indigo-600 hover:underline text-sm">Back to courses</Link>
        </div>
      </div>
    );
  }

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const freeLessons = course.modules.reduce((sum, m) => sum + m.lessons.filter((l) => l.isPreview).length, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link href="/courses" className="text-slate-500 hover:text-slate-800 text-sm">
            ← Courses
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-800 truncate max-w-xs">{course.title}</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: curriculum */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title + meta */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', levelColors[course.level])}>
                  {course.level}
                </span>
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', {
                  'bg-emerald-100 text-emerald-700': course.status === 'PUBLISHED',
                  'bg-slate-100 text-slate-600': course.status === 'DRAFT',
                  'bg-orange-100 text-orange-700': course.status === 'ARCHIVED',
                })}>
                  {course.status}
                </span>
                {course.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{course.title}</h1>
              {course.description && (
                <p className="text-slate-500 leading-relaxed">{course.description}</p>
              )}
            </div>

            {/* Admin actions */}
            {canManage && (
              <div className="flex flex-wrap gap-2 pt-2">
                {course.status === 'DRAFT' && (
                  <button
                    onClick={handlePublish}
                    disabled={publish.isPending}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                  >
                    {publish.isPending ? 'Publishing...' : 'Publish'}
                  </button>
                )}
                {course.status === 'PUBLISHED' && (
                  <button
                    onClick={handleArchive}
                    disabled={archive.isPending}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-60 transition-colors"
                  >
                    {archive.isPending ? 'Archiving...' : 'Archive'}
                  </button>
                )}
                <Link
                  href={`/courses/${id}/edit`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleteCourse.isPending}
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-60 transition-colors"
                >
                  {deleteCourse.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}

            {actionError && (
              <p className="text-red-500 text-sm">{actionError}</p>
            )}

            {/* Curriculum */}
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">
                Curriculum — {totalLessons} lessons
              </h2>

              {course.modules.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
                  No modules yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {course.modules.map((mod: CourseModule) => (
                    <div key={mod.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 text-sm font-medium w-6 text-center">
                            {mod.sortOrder}
                          </span>
                          <div>
                            <span className="font-medium text-slate-800">{mod.title}</span>
                            <span className="ml-2 text-xs text-slate-400">
                              {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <span className="text-slate-400 text-sm">
                          {expandedModules.has(mod.id) ? '▲' : '▼'}
                        </span>
                      </button>

                      {expandedModules.has(mod.id) && (
                        <div className="border-t border-slate-100">
                          {mod.lessons.length === 0 ? (
                            <p className="px-6 py-3 text-sm text-slate-400">No lessons yet</p>
                          ) : (
                            mod.lessons.map((lesson) => (
                              <div
                                key={lesson.id}
                                className="flex items-center gap-3 px-6 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50"
                              >
                                <span className="text-slate-300 text-xs w-5 text-center">{lesson.sortOrder}</span>
                                <span className="text-sm text-slate-600 flex-1">{lesson.title}</span>
                                <div className="flex items-center gap-2">
                                  {lesson.isPreview && (
                                    <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Free</span>
                                  )}
                                  <span className="text-xs text-slate-400">{lesson.lessonType}</span>
                                  {lesson.estimatedMinutes != null && lesson.estimatedMinutes > 0 && (
                                    <span className="text-xs text-slate-400">{lesson.estimatedMinutes}m</span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: sidebar */}
          <div className="space-y-4">
            {/* Thumbnail */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-indigo-100 to-slate-100 flex items-center justify-center">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl">📖</span>
                )}
              </div>
              <div className="p-5 space-y-4">
                <div className="text-2xl font-bold text-slate-900">
                  {Number(course.price) === 0 ? 'Free' : `₮${Number(course.price).toLocaleString()}`}
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Lessons</span>
                    <span className="font-medium">{totalLessons}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Free lessons</span>
                    <span className="font-medium">{freeLessons}</span>
                  </div>
                  {course.totalMinutes > 0 && (
                    <div className="flex justify-between">
                      <span>Duration</span>
                      <span className="font-medium">{course.totalMinutes} min</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Language</span>
                    <span className="font-medium uppercase">{course.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Level</span>
                    <span className="font-medium">{course.level}</span>
                  </div>
                </div>

                {course.status === 'PUBLISHED' && (
                  <button className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                    Enroll Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
