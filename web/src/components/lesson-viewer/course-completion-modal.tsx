'use client';

import Link from 'next/link';

interface CourseCompletionModalProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

export function CourseCompletionModal({ courseId, courseTitle, onClose }: CourseCompletionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-fade-in">
        <div className="text-6xl mb-4">🎓</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Курс дуусгалаа!</h2>
        <p className="text-gray-600 mb-1 font-medium">{courseTitle}</p>
        <p className="text-sm text-gray-400 mb-6">Сертификат үүсгэгдэж байна...</p>

        <div className="flex flex-col gap-3">
          <Link
            href="/certificates"
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors text-sm"
          >
            🏆 Миний гэрчилгээнүүд
          </Link>
          <Link
            href={`/courses/${courseId}`}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm"
          >
            Сургалт руу буцах
          </Link>
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
          >
            Хаах
          </button>
        </div>
      </div>
    </div>
  );
}
