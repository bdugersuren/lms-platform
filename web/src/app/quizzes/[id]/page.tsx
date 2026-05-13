'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuiz, useMyAttempts, useStartAttempt } from '@/hooks/use-quiz';
import { clsx } from 'clsx';
import type { AttemptStatus } from '@/types/quiz';

const statusLabel: Record<AttemptStatus, { text: string; cls: string }> = {
  IN_PROGRESS: { text: 'Дуусаагүй', cls: 'bg-yellow-100 text-yellow-700' },
  SUBMITTED: { text: 'Илгээсэн', cls: 'bg-blue-100 text-blue-700' },
  GRADED: { text: 'Дүгнэгдсэн', cls: 'bg-green-100 text-green-700' },
  EXPIRED: { text: 'Хугацаа дууссан', cls: 'bg-red-100 text-red-700' },
};

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: quiz, isLoading: quizLoading } = useQuiz(id);
  const { data: attempts } = useMyAttempts(id);
  const startAttempt = useStartAttempt();

  const handleStart = async () => {
    const attempt = await startAttempt.mutateAsync(id);
    router.push(`/quizzes/${id}/take/${attempt.id}`);
  };

  const inProgressAttempt = attempts?.find((a) => a.status === 'IN_PROGRESS');
  const attemptsUsed = attempts?.length ?? 0;

  if (quizLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-500">
        Тест олдсонгүй.
      </div>
    );
  }

  const canAttempt = quiz.isPublished && attemptsUsed < quiz.maxAttempts;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/quizzes" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-semibold text-gray-900 truncate">{quiz.title}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Quiz info card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{quiz.title}</h2>
              {quiz.description && (
                <p className="text-sm text-gray-500 mt-1">{quiz.description}</p>
              )}
            </div>
            <span
              className={clsx(
                'px-2.5 py-0.5 rounded-full text-xs font-medium',
                quiz.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
              )}
            >
              {quiz.isPublished ? 'Нийтлэгдсэн' : 'Ноорог'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-50">
            <StatCard icon="📋" label="Асуулт" value={String(quiz.questions?.length ?? 0)} />
            <StatCard icon="✅" label="Дамжих оноо" value={`${quiz.passingScore}%`} />
            <StatCard icon="🔄" label="Оролдлого" value={`${attemptsUsed}/${quiz.maxAttempts}`} />
            <StatCard
              icon="⏱"
              label="Хугацаа"
              value={quiz.timeLimit ? `${quiz.timeLimit} мин` : 'Хязгааргүй'}
            />
          </div>

          <div className="mt-5 flex gap-3">
            {inProgressAttempt ? (
              <button
                onClick={() => router.push(`/quizzes/${id}/take/${inProgressAttempt.id}`)}
                className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                Үргэлжлүүлэх
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={!canAttempt || startAttempt.isPending}
                className={clsx(
                  'px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors',
                  canAttempt
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-gray-300 cursor-not-allowed',
                )}
              >
                {startAttempt.isPending
                  ? 'Эхлүүлж байна...'
                  : !quiz.isPublished
                  ? 'Нийтлэгдээгүй'
                  : attemptsUsed >= quiz.maxAttempts
                  ? 'Оролдлого дууссан'
                  : 'Тест эхлүүлэх'}
              </button>
            )}
          </div>

          {startAttempt.isError && (
            <p className="mt-3 text-sm text-red-500">{startAttempt.error.message}</p>
          )}
        </div>

        {/* Previous attempts */}
        {attempts && attempts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Өмнөх оролдлогууд</h3>
            <div className="space-y-3">
              {attempts.map((attempt, idx) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600">#{idx + 1}</span>
                    <div>
                      <p className="text-xs text-gray-500">
                        {new Date(attempt.startedAt).toLocaleDateString('mn-MN')}
                      </p>
                      {attempt.submittedAt && (
                        <p className="text-xs text-gray-400">
                          Дуусгасан: {new Date(attempt.submittedAt).toLocaleTimeString('mn-MN')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {attempt.status === 'GRADED' && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{attempt.score.toFixed(1)}%</p>
                        <p
                          className={clsx(
                            'text-xs font-medium',
                            attempt.passed ? 'text-green-600' : 'text-red-500',
                          )}
                        >
                          {attempt.passed ? 'Тэнцсэн' : 'Тэнцээгүй'}
                        </p>
                      </div>
                    )}
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        statusLabel[attempt.status].cls,
                      )}
                    >
                      {statusLabel[attempt.status].text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Questions preview */}
        {quiz.questions && quiz.questions.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Асуултууд ({quiz.questions.length})
            </h3>
            <div className="space-y-3">
              {quiz.questions.map((q, idx) => (
                <div key={q.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{q.questionText}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{q.score} оноо • {q.options.length} сонголт</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
