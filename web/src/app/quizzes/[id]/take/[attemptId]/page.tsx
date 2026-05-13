'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuiz, useSubmitAttempt } from '@/hooks/use-quiz';
import { clsx } from 'clsx';
import type { AnswerDto, Question } from '@/types/quiz';

export default function TakeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  const attemptId = params.attemptId as string;

  const { data: quiz, isLoading } = useQuiz(quizId);
  const submitAttempt = useSubmitAttempt();

  const [answers, setAnswers] = useState<Record<string, AnswerDto>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const questions = quiz?.questions ?? [];
  const current = questions[currentIdx];

  const handleSingleChoice = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { questionId, selectedOptionIds: [optionId] },
    }));
  };

  const handleMultiChoice = (questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const existing = prev[questionId]?.selectedOptionIds ?? [];
      const updated = existing.includes(optionId)
        ? existing.filter((id) => id !== optionId)
        : [...existing, optionId];
      return { ...prev, [questionId]: { questionId, selectedOptionIds: updated } };
    });
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { questionId, textAnswer: text } }));
  };

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);

    const dto = { answers: Object.values(answers) };
    const result = await submitAttempt.mutateAsync({ quizId, attemptId, dto });

    router.push(`/quizzes/${quizId}?result=${result.passed ? 'passed' : 'failed'}&score=${result.score.toFixed(1)}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-500">
        Асуулт байхгүй байна.
      </div>
    );
  }

  const progress = ((currentIdx + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <h1 className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">{quiz.title}</h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              {answeredCount}/{questions.length} хариулсан
            </span>
            <span className="text-xs font-medium text-indigo-600">
              {currentIdx + 1}/{questions.length}
            </span>
          </div>
        </div>
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <QuestionCard
          question={current}
          answer={answers[current.id]}
          onSingleChoice={(optionId) => handleSingleChoice(current.id, optionId)}
          onMultiChoice={(optionId) => handleMultiChoice(current.id, optionId)}
          onTextAnswer={(text) => handleTextAnswer(current.id, text)}
        />

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Өмнөх
          </button>

          <div className="flex items-center gap-2">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                className={clsx(
                  'w-2.5 h-2.5 rounded-full transition-all',
                  idx === currentIdx
                    ? 'bg-indigo-600 scale-125'
                    : answers[questions[idx].id]
                    ? 'bg-green-400'
                    : 'bg-gray-200',
                )}
              />
            ))}
          </div>

          {currentIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Дараах
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitAttempt.isPending || submitted}
              className={clsx(
                'px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors',
                submitAttempt.isPending || submitted
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700',
              )}
            >
              {submitAttempt.isPending ? 'Илгээж байна...' : 'Дуусгах'}
            </button>
          )}
        </div>

        {submitAttempt.isError && (
          <p className="mt-4 text-sm text-red-500 text-center">{submitAttempt.error.message}</p>
        )}
      </main>
    </div>
  );
}

function QuestionCard({
  question,
  answer,
  onSingleChoice,
  onMultiChoice,
  onTextAnswer,
}: {
  question: Question;
  answer: AnswerDto | undefined;
  onSingleChoice: (optionId: string) => void;
  onMultiChoice: (optionId: string) => void;
  onTextAnswer: (text: string) => void;
}) {
  const selectedIds = answer?.selectedOptionIds ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-sm text-gray-500 mb-2">
        {question.questionType === 'SINGLE_CHOICE' && 'Нэгийг сонгоно уу'}
        {question.questionType === 'MULTIPLE_CHOICE' && 'Олон сонгож болно'}
        {question.questionType === 'TRUE_FALSE' && 'Үнэн эсвэл худал'}
        {question.questionType === 'SHORT_TEXT' && 'Хариултаа бичнэ үү'}
      </p>
      <h2 className="text-base font-semibold text-gray-900 mb-5">{question.questionText}</h2>

      {question.questionType === 'SHORT_TEXT' ? (
        <textarea
          value={answer?.textAnswer ?? ''}
          onChange={(e) => onTextAnswer(e.target.value)}
          rows={4}
          placeholder="Хариултаа энд бичнэ үү..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      ) : (
        <div className="space-y-2.5">
          {question.options.map((option) => {
            const isSelected = selectedIds.includes(option.id);
            const isMulti = question.questionType === 'MULTIPLE_CHOICE';

            return (
              <button
                key={option.id}
                onClick={() => isMulti ? onMultiChoice(option.id) : onSingleChoice(option.id)}
                className={clsx(
                  'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm transition-all',
                  isSelected
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-900'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-slate-50 text-gray-700',
                )}
              >
                <span
                  className={clsx(
                    'w-5 h-5 flex-shrink-0 flex items-center justify-center border-2 transition-colors',
                    isMulti ? 'rounded-md' : 'rounded-full',
                    isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300',
                  )}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                {option.optionText}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
