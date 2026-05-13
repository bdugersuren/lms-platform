'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAssignmentsByCourse } from '@/hooks/use-assignment';
import { clsx } from 'clsx';
import type { Assignment } from '@/types/assignment';

const typeLabel: Record<string, { icon: string; label: string }> = {
  TEXT: { icon: '✏️', label: 'Текст' },
  FILE_UPLOAD: { icon: '📎', label: 'Файл' },
  LINK: { icon: '🔗', label: 'Холбоос' },
  CODE: { icon: '💻', label: 'Код' },
};

function AssignmentCard({ a }: { a: Assignment }) {
  const router = useRouter();
  const t = typeLabel[a.type] ?? { icon: '📄', label: a.type };
  const overdue = a.dueDate && new Date(a.dueDate) < new Date() && a.isPublished;

  return (
    <div
      onClick={() => router.push(`/assignments/${a.id}`)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 flex-1">
          <span className="text-2xl">{t.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{a.title}</h3>
            {a.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.description}</p>
            )}
          </div>
        </div>
        <span
          className={clsx(
            'ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium',
            a.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
          )}
        >
          {a.isPublished ? 'Нийтлэгдсэн' : 'Ноорог'}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          {t.label}
        </span>
        <span className="flex items-center gap-1">
          🏆 {a.maxScore} оноо
        </span>
        <span className="flex items-center gap-1">
          ✅ {a.passingScore}% дамжих
        </span>
        {a.dueDate && (
          <span className={clsx('flex items-center gap-1', overdue ? 'text-red-500' : '')}>
            📅 {new Date(a.dueDate).toLocaleDateString('mn-MN')}
            {overdue && ' (хугацаа дууссан)'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AssignmentsPage() {
  const router = useRouter();
  const [courseId, setCourseId] = useState('');
  const [inputValue, setInputValue] = useState('');

  const { data: assignments, isLoading, isError } = useAssignmentsByCourse(courseId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCourseId(inputValue.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <span className="font-semibold text-gray-900">Даалгавар</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Курс ID-р хайх</h2>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Course ID оруулна уу..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Хайх
            </button>
          </form>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isError && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm">
            Даалгавар ачааллахад алдаа гарлаа.
          </div>
        )}

        {assignments && assignments.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <span className="text-4xl block mb-3">📭</span>
            Энэ курст даалгавар байхгүй байна.
          </div>
        )}

        {assignments && assignments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assignments.map((a) => (
              <AssignmentCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
