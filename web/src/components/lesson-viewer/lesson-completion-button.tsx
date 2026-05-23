'use client';

import { clsx } from 'clsx';
import { useCompleteLesson } from '@/hooks/use-enrollment';

interface Props {
  enrollmentId: string;
  lessonId: string;
  completed: boolean;
  locked: boolean;
  isLastLesson: boolean;
  onCompleted?: () => void;
}

export function LessonCompletionButton({ enrollmentId, lessonId, completed, locked, isLastLesson, onCompleted }: Props) {
  const { mutate, isPending } = useCompleteLesson();

  if (completed) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-700">
        <span>✓</span>
        <span>Дуусгасан</span>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-400">
        <span>🔒</span>
        <span>Хичээл түгжигдсэн</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => mutate({ enrollmentId, lessonId }, { onSuccess: () => onCompleted?.() })}
      disabled={isPending}
      className={clsx(
        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
        isLastLesson
          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
          : 'bg-indigo-600 text-white hover:bg-indigo-700',
        isPending && 'opacity-60 cursor-not-allowed',
      )}
    >
      {isPending ? (
        <>
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Хадгалж байна...</span>
        </>
      ) : (
        <>
          <span>{isLastLesson ? '🎓' : '✓'}</span>
          <span>{isLastLesson ? 'Курс дуусгах' : 'Дуусгасан гэж тэмдэглэх'}</span>
        </>
      )}
    </button>
  );
}
