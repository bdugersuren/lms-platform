'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCreateCourse } from '@/hooks/use-courses';
import { useMe } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import type { CourseLevel } from '@/types/course';
import { clsx } from 'clsx';

const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

export default function NewCoursePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data: user, isLoading: userLoading } = useMe();
  const createCourse = useCreateCourse();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<CourseLevel>('BEGINNER');
  const [price, setPrice] = useState('0');
  const [language, setLanguage] = useState('mn');
  const [tagsInput, setTagsInput] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [error, setError] = useState('');

  const isAllowed =
    user?.role === 'INSTRUCTOR' ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN';

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAllowed) {
    router.replace('/courses');
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    createCourse.mutate(
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
        onSuccess: (res) => {
          router.push(`/courses/${res.data.id}`);
        },
        onError: (err) => {
          setError(err.message);
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href="/courses" className="text-slate-500 hover:text-slate-800 text-sm">
            ← Courses
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-800">New Course</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Create a new course</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Web Development"
              className={clsx(
                'w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
                !title && error ? 'border-red-400' : 'border-slate-300',
              )}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What will students learn in this course?"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              maxLength={2000}
            />
            <p className="text-xs text-slate-400 mt-1">{description.length}/2000</p>
          </div>

          {/* Level + Language */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Level</label>
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Language</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Price (₮)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="100"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">Set to 0 for a free course</p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="javascript, web, frontend (comma separated)"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Thumbnail URL</label>
            <input
              type="url"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={createCourse.isPending}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {createCourse.isPending ? 'Creating...' : 'Create Course'}
            </button>
            <Link
              href="/courses"
              className="px-6 py-2.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
