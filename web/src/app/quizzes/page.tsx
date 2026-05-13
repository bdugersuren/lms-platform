'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuizzesByCourse } from '@/hooks/use-quiz';
import { clsx } from 'clsx';

export default function QuizzesPage() {
  const router = useRouter();
  const [courseId, setCourseId] = useState('');
  const [inputValue, setInputValue] = useState('');

  const { data: quizzes, isLoading, isError } = useQuizzesByCourse(courseId);

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
              <span className="text-xl">📝</span>
              <span className="font-semibold text-gray-900">Тест / Шалгалт</span>
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
            Тест ачааллахад алдаа гарлаа.
          </div>
        )}

        {quizzes && quizzes.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <span className="text-4xl block mb-3">📭</span>
            Энэ курст тест байхгүй байна.
          </div>
        )}

        {quizzes && quizzes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer"
                onClick={() => router.push(`/quizzes/${quiz.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{quiz.description}</p>
                    )}
                  </div>
                  <span
                    className={clsx(
                      'ml-3 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium',
                      quiz.isPublished
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700',
                    )}
                  >
                    {quiz.isPublished ? 'Нийтлэгдсэн' : 'Ноорог'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {quiz._count?.questions ?? 0} асуулт
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {quiz.passingScore}% дамжих оноо
                  </span>
                  {quiz.timeLimit && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {quiz.timeLimit} мин
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
