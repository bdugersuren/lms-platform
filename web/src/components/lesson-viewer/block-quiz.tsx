'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import type { InteractiveBlock, InteractiveQuestion, QuestionType } from '@/types/course';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnswerDraft {
  selectedOptionIds: string[];
  textAnswer: string;
}

interface QuestionResult {
  isCorrect: boolean | null; // null = needs AI eval
  correctOptionIds: string[];
  scoreAwarded: number;
}

// ─── Block dispatcher ─────────────────────────────────────────────────────────

export interface BlockQuizProps {
  block: InteractiveBlock;
  onComplete: (passed: boolean) => void;
  preview?: boolean;
}

export function BlockQuiz({ block, onComplete, preview }: BlockQuizProps) {
  if (block.blockType === 'INFO') {
    return <InfoBlock block={block} onComplete={onComplete} />;
  }
  if (block.blockType === 'ASSIGNMENT') {
    return <AssignmentBlock block={block} onComplete={onComplete} />;
  }
  if (block.blockType === 'AI_PROMPT') {
    return <AiPromptBlock block={block} onComplete={onComplete} />;
  }
  // QUIZ / CHECKPOINT
  return <QuizBlock block={block} onComplete={onComplete} />;
}

// ─── Info block ───────────────────────────────────────────────────────────────

function InfoBlock({ block, onComplete }: BlockQuizProps) {
  const content = (block.contentJson as Record<string, string>)?.text ?? '';
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">ℹ️</span>
        <div>
          {block.title && <p className="font-semibold text-blue-900 mb-1">{block.title}</p>}
          <p className="text-blue-800 text-sm leading-relaxed whitespace-pre-wrap">
            {content || 'Мэдээллийн блок'}
          </p>
          {!block.isRequired && (
            <button
              onClick={() => onComplete(true)}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              Үргэлжлүүлэх →
            </button>
          )}
          {block.isRequired && (
            <button
              onClick={() => onComplete(true)}
              className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ойлголоо, үргэлжлүүлэх
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Assignment block ─────────────────────────────────────────────────────────

function AssignmentBlock({ block, onComplete }: BlockQuizProps) {
  const [submitted, setSubmitted] = useState(false);
  const [answer, setAnswer] = useState('');
  const content = (block.contentJson as Record<string, string>)?.description ?? '';

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📋</span>
        <span className="font-semibold text-purple-900">{block.title ?? 'Даалгавар'}</span>
      </div>
      {content && <p className="text-purple-800 text-sm mb-4 leading-relaxed">{content}</p>}
      {!submitted ? (
        <div className="space-y-3">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder="Хариултаа энд бичнэ үү..."
            className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white resize-none"
          />
          <button
            onClick={() => { setSubmitted(true); onComplete(true); }}
            disabled={!answer.trim()}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            Илгээх
          </button>
        </div>
      ) : (
        <div className="bg-purple-100 rounded-lg px-4 py-3 text-sm text-purple-800">
          ✓ Даалгавар илгээгдлээ. Багшийн үнэлгээг хүлээнэ үү.
        </div>
      )}
    </div>
  );
}

// ─── AI Prompt block ──────────────────────────────────────────────────────────

function AiPromptBlock({ block, onComplete }: BlockQuizProps) {
  const [submitted, setSubmitted] = useState(false);
  const [answer, setAnswer] = useState('');
  const prompt = (block.contentJson as Record<string, string>)?.prompt ?? '';

  return (
    <div className="bg-pink-50 border border-pink-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🤖</span>
        <span className="font-semibold text-pink-900">{block.title ?? 'AI Асуулт'}</span>
      </div>
      {prompt && (
        <p className="text-pink-800 text-sm mb-4 leading-relaxed bg-pink-100 rounded-lg p-3">
          {prompt}
        </p>
      )}
      {!submitted ? (
        <div className="space-y-3">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            placeholder="Хариултаа дэлгэрэнгүй бичнэ үү..."
            className="w-full px-3 py-2 text-sm border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white resize-none"
          />
          <button
            onClick={() => { setSubmitted(true); onComplete(true); }}
            disabled={!answer.trim()}
            className="px-4 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors"
          >
            Илгээх
          </button>
        </div>
      ) : (
        <div className="bg-pink-100 rounded-lg px-4 py-3 text-sm text-pink-800">
          ✓ Хариулт хүлээн авлаа. AI үнэлэж байна...
        </div>
      )}
    </div>
  );
}

// ─── Quiz block ───────────────────────────────────────────────────────────────

function QuizBlock({ block, onComplete }: BlockQuizProps) {
  const questions = block.questions ?? [];
  const maxScore = questions.reduce((s, q) => s + q.score, 0);

  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, { selectedOptionIds: [], textAnswer: '' }]))
  );
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, QuestionResult>>({});
  const [earnedScore, setEarnedScore] = useState(0);
  const [passed, setPassed] = useState(false);

  const blockTypeLabel = block.blockType === 'CHECKPOINT' ? 'Шалгалт' : 'Тест';
  const blockBg = block.blockType === 'CHECKPOINT'
    ? 'bg-blue-50 border-blue-200'
    : 'bg-amber-50 border-amber-200';
  const blockHeaderBg = block.blockType === 'CHECKPOINT'
    ? 'bg-blue-100/60'
    : 'bg-amber-100/60';

  const handleSelect = (questionId: string, optionId: string, type: QuestionType) => {
    if (submitted) return;
    setAnswers((prev) => {
      const cur = prev[questionId];
      if (type === 'SINGLE_CHOICE' || type === 'TRUE_FALSE') {
        return { ...prev, [questionId]: { ...cur, selectedOptionIds: [optionId] } };
      }
      // MULTIPLE_CHOICE: toggle
      const selected = cur.selectedOptionIds.includes(optionId)
        ? cur.selectedOptionIds.filter((id) => id !== optionId)
        : [...cur.selectedOptionIds, optionId];
      return { ...prev, [questionId]: { ...cur, selectedOptionIds: selected } };
    });
  };

  const handleTextChange = (questionId: string, text: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], textAnswer: text } }));
  };

  const isAnswered = (q: InteractiveQuestion) => {
    const ans = answers[q.id];
    if (q.questionType === 'SHORT_TEXT' || q.questionType === 'ORDERING' || q.questionType === 'MATCHING') {
      return ans.textAnswer.trim().length > 0;
    }
    return ans.selectedOptionIds.length > 0;
  };

  const allAnswered = questions.every(isAnswered);

  const handleSubmit = () => {
    const newResults: Record<string, QuestionResult> = {};
    let earned = 0;

    for (const q of questions) {
      const ans = answers[q.id];
      const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);

      let isCorrect: boolean | null = null;
      let scoreAwarded = 0;

      if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'TRUE_FALSE') {
        isCorrect =
          ans.selectedOptionIds.length === 1 && correctIds.includes(ans.selectedOptionIds[0]);
        scoreAwarded = isCorrect ? q.score : 0;
      } else if (q.questionType === 'MULTIPLE_CHOICE') {
        const sel = new Set(ans.selectedOptionIds);
        const cor = new Set(correctIds);
        isCorrect = sel.size === cor.size && Array.from(sel).every((id) => cor.has(id));
        scoreAwarded = isCorrect ? q.score : 0;
      } else {
        // SHORT_TEXT, ORDERING, MATCHING — flag for AI/manual eval
        isCorrect = null;
        scoreAwarded = 0;
      }

      earned += scoreAwarded;
      newResults[q.id] = { isCorrect, correctOptionIds: correctIds, scoreAwarded };
    }

    const percent = maxScore > 0 ? (earned / maxScore) * 100 : 100;
    const hasPassed = percent >= (block.passingScore ?? 60);

    setResults(newResults);
    setEarnedScore(earned);
    setPassed(hasPassed);
    setSubmitted(true);
  };

  const handleRetry = () => {
    setSubmitted(false);
    setResults({});
    setEarnedScore(0);
    setPassed(false);
    setAnswers(Object.fromEntries(questions.map((q) => [q.id, { selectedOptionIds: [], textAnswer: '' }])));
  };

  return (
    <div className={clsx('border rounded-xl overflow-hidden', blockBg)}>
      {/* Header */}
      <div className={clsx('px-5 py-3 flex items-center justify-between', blockHeaderBg)}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{block.title ?? blockTypeLabel}</span>
          {block.isRequired && (
            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Заавал</span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {questions.length} асуулт · {maxScore} оноо
        </span>
      </div>

      {/* Questions */}
      <div className="p-5 space-y-6">
        {questions.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">Асуулт байхгүй байна</p>
        )}

        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={idx}
            answer={answers[q.id]}
            result={results[q.id]}
            submitted={submitted}
            onSelect={(optionId) => handleSelect(q.id, optionId, q.questionType)}
            onTextChange={(text) => handleTextChange(q.id, text)}
          />
        ))}

        {/* Feedback */}
        {submitted && (
          <div
            className={clsx(
              'rounded-xl p-4 border',
              passed
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200',
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={clsx('font-semibold', passed ? 'text-emerald-700' : 'text-red-700')}>
                {passed ? '✓ Тэнцлээ!' : '✗ Тэнцсэнгүй'}
              </span>
              <span className="text-sm text-slate-600">
                {earnedScore} / {maxScore} оноо
                {maxScore > 0 && ` (${Math.round((earnedScore / maxScore) * 100)}%)`}
              </span>
            </div>
            {!passed && block.continueOnPassOnly && (
              <p className="text-xs text-red-600 mt-1">
                Үргэлжлүүлэхийн тулд {block.passingScore ?? 60}% буюу түүнээс дээш оноо авах шаардлагатай.
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || questions.length === 0}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Шалгах
            </button>
          ) : (
            <>
              <button
                onClick={handleRetry}
                className="px-5 py-2.5 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
              >
                Дахин оролдох
              </button>
              {(passed || !block.continueOnPassOnly) && (
                <button
                  onClick={() => onComplete(passed)}
                  className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Үргэлжлүүлэх →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Question card ────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: InteractiveQuestion;
  index: number;
  answer: AnswerDraft;
  result?: QuestionResult;
  submitted: boolean;
  onSelect: (optionId: string) => void;
  onTextChange: (text: string) => void;
}

function QuestionCard({
  question,
  index,
  answer,
  result,
  submitted,
  onSelect,
  onTextChange,
}: QuestionCardProps) {
  const isTextType =
    question.questionType === 'SHORT_TEXT' ||
    question.questionType === 'ORDERING' ||
    question.questionType === 'MATCHING';

  const isTrueFalse = question.questionType === 'TRUE_FALSE';
  const isMultiple = question.questionType === 'MULTIPLE_CHOICE';

  const questionTypeLabel: Record<string, string> = {
    SINGLE_CHOICE: 'Нэг сонголт',
    MULTIPLE_CHOICE: 'Олон сонголт',
    TRUE_FALSE: 'Үнэн/Худал',
    ORDERING: 'Эрэмбэлэх',
    MATCHING: 'Тааруулах',
    SHORT_TEXT: 'Богино хариулт',
  };

  const resultColor = !result
    ? ''
    : result.isCorrect === null
    ? 'text-amber-600'
    : result.isCorrect
    ? 'text-emerald-600'
    : 'text-red-600';

  const resultIcon = !result
    ? ''
    : result.isCorrect === null
    ? '⏳'
    : result.isCorrect
    ? '✓'
    : '✗';

  return (
    <div className="space-y-3">
      {/* Question header */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-7 h-7 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-medium text-slate-800 leading-snug">{question.questionText}</p>
            {submitted && result && (
              <span className={clsx('text-sm font-semibold', resultColor)}>
                {resultIcon} {result.scoreAwarded}/{question.score}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">
            {questionTypeLabel[question.questionType]} · {question.score} оноо
          </span>
        </div>
      </div>

      {/* Options */}
      {!isTextType && (
        <div className="ml-10 space-y-2">
          {isTrueFalse ? (
            /* TRUE/FALSE: two big toggle buttons */
            <div className="flex gap-3">
              {question.options.map((opt) => {
                const isSelected = answer.selectedOptionIds.includes(opt.id);
                const isCorrectOpt = result?.correctOptionIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => onSelect(opt.id)}
                    disabled={submitted}
                    className={clsx(
                      'flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
                      submitted
                        ? isCorrectOpt
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : isSelected && !isCorrectOpt
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-slate-200 text-slate-400'
                        : isSelected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700',
                    )}
                  >
                    {opt.optionText}
                  </button>
                );
              })}
            </div>
          ) : (
            /* SINGLE / MULTIPLE */
            question.options.map((opt) => {
              const isSelected = answer.selectedOptionIds.includes(opt.id);
              const isCorrectOpt = result?.correctOptionIds.includes(opt.id);
              const isWrongSelected = submitted && isSelected && !isCorrectOpt;
              const isMissedCorrect = submitted && isCorrectOpt && !isSelected;

              return (
                <button
                  key={opt.id}
                  onClick={() => onSelect(opt.id)}
                  disabled={submitted}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all',
                    submitted
                      ? isCorrectOpt
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                        : isWrongSelected
                        ? 'border-red-400 bg-red-50 text-red-800'
                        : 'border-slate-200 text-slate-400'
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700',
                  )}
                >
                  {/* Indicator */}
                  <span
                    className={clsx(
                      'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all',
                      submitted
                        ? isCorrectOpt
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : isWrongSelected
                          ? 'border-red-400 bg-red-400 text-white'
                          : 'border-slate-300'
                        : isSelected
                        ? 'border-indigo-500 bg-indigo-500 text-white'
                        : 'border-slate-300',
                    )}
                  >
                    {submitted && isCorrectOpt && '✓'}
                    {submitted && isWrongSelected && '✗'}
                    {!submitted && isSelected && '●'}
                  </span>
                  <span>{opt.optionText}</span>
                  {submitted && isMissedCorrect && (
                    <span className="ml-auto text-xs text-emerald-600 font-medium">← Зөв хариулт</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Text input */}
      {isTextType && (
        <div className="ml-10">
          <textarea
            value={answer.textAnswer}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={submitted}
            rows={3}
            placeholder="Хариултаа бичнэ үү..."
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-60"
          />
          {submitted && (
            <p className="text-xs text-amber-600 mt-1">
              ⏳ Энэ хариулт багш эсвэл AI-аар үнэлэгдэнэ.
            </p>
          )}
        </div>
      )}

      {/* Explanation */}
      {submitted && question.explanation && (
        <div className="ml-10 px-3 py-2.5 bg-slate-100 rounded-xl text-xs text-slate-600">
          💡 <span className="font-medium">Тайлбар:</span> {question.explanation}
        </div>
      )}
    </div>
  );
}
