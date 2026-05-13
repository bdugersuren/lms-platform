'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  useInteractiveBlocks,
  useCreateBlock,
  useUpdateBlock,
  useDeleteBlock,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useCreateOption,
  useUpdateOption,
  useDeleteOption,
} from '@/hooks/use-blocks';
import type {
  InteractiveBlockType,
  QuestionType,
  InteractiveBlock,
  InteractiveQuestion,
  InteractiveQuestionOption,
} from '@/types/course';

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOCK_TYPES: { value: InteractiveBlockType; label: string; icon: string }[] = [
  { value: 'QUIZ', label: 'Тест', icon: '📝' },
  { value: 'CHECKPOINT', label: 'Шалгалт', icon: '✅' },
  { value: 'INFO', label: 'Мэдээлэл', icon: 'ℹ️' },
  { value: 'ASSIGNMENT', label: 'Даалгавар', icon: '📋' },
  { value: 'AI_PROMPT', label: 'AI асуулт', icon: '🤖' },
];

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'SINGLE_CHOICE', label: 'Нэг сонголт' },
  { value: 'MULTIPLE_CHOICE', label: 'Олон сонголт' },
  { value: 'TRUE_FALSE', label: 'Үнэн/Худал' },
  { value: 'ORDERING', label: 'Эрэмбэлэх' },
  { value: 'MATCHING', label: 'Тааруулах' },
  { value: 'SHORT_TEXT', label: 'Богино хариулт' },
];

const BLOCK_TYPE_COLORS: Record<InteractiveBlockType, string> = {
  QUIZ: 'bg-amber-50 text-amber-700 border-amber-200',
  CHECKPOINT: 'bg-blue-50 text-blue-700 border-blue-200',
  INFO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ASSIGNMENT: 'bg-purple-50 text-purple-700 border-purple-200',
  AI_PROMPT: 'bg-pink-50 text-pink-700 border-pink-200',
};

function formatTrigger(block: InteractiveBlock): string | null {
  if (block.triggerSecond != null) {
    const m = Math.floor(block.triggerSecond / 60);
    const s = block.triggerSecond % 60;
    return `⏱ ${m}:${String(s).padStart(2, '0')}`;
  }
  if (block.triggerPage != null) return `📄 p.${block.triggerPage}`;
  if (block.triggerParagraph != null) return `¶ ${block.triggerParagraph}`;
  return null;
}

// ─── Option Row (inline editable) ────────────────────────────────────────────

function OptionRow({
  option,
  lessonId,
  questionType,
  onEnterKey,
}: {
  option: InteractiveQuestionOption;
  lessonId: string;
  questionType: QuestionType;
  onEnterKey: () => void;
}) {
  const updateOption = useUpdateOption(lessonId);
  const deleteOption = useDeleteOption(lessonId);
  const [text, setText] = useState(option.optionText);

  const handleBlur = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== option.optionText) {
      updateOption.mutate({ optionId: option.id, dto: { optionText: trimmed } });
    }
  };

  const handleCorrectToggle = () => {
    updateOption.mutate({ optionId: option.id, dto: { isCorrect: !option.isCorrect } });
  };

  const handleDelete = () => {
    if (!window.confirm('Энэ сонголтыг устгах уу?')) return;
    deleteOption.mutate(option.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
      onEnterKey();
    }
  };

  return (
    <div className="flex items-center gap-2 group">
      {/* Correct toggle */}
      {questionType === 'SINGLE_CHOICE' ? (
        <button
          type="button"
          onClick={handleCorrectToggle}
          title="Зөв хариулт тэмдэглэх"
          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
            option.isCorrect
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-slate-300 hover:border-emerald-400'
          }`}
        />
      ) : (
        <button
          type="button"
          onClick={handleCorrectToggle}
          title="Зөв хариулт тэмдэглэх"
          className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            option.isCorrect
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300 hover:border-emerald-400'
          }`}
        >
          {option.isCorrect && (
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 10">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}

      {/* Option text */}
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="flex-1 px-2 py-1 text-sm border-0 border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none bg-transparent transition-colors"
        placeholder="Сонголтын текст..."
      />

      {/* Correct badge */}
      {option.isCorrect && (
        <span className="text-xs text-emerald-600 font-medium flex-shrink-0">✓</span>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleteOption.isPending}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all flex-shrink-0 text-xs"
        title="Устгах"
      >
        ✕
      </button>
    </div>
  );
}

// ─── True/False Toggle ────────────────────────────────────────────────────────

function TrueFalseOptions({
  options,
  lessonId,
}: {
  options: InteractiveQuestionOption[];
  lessonId: string;
}) {
  const updateOption = useUpdateOption(lessonId);
  const sorted = options.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  const handleToggle = (opt: InteractiveQuestionOption) => {
    // Make this one correct, others incorrect
    sorted.forEach((o) => {
      if (o.id !== opt.id && o.isCorrect) {
        updateOption.mutate({ optionId: o.id, dto: { isCorrect: false } });
      }
    });
    if (!opt.isCorrect) {
      updateOption.mutate({ optionId: opt.id, dto: { isCorrect: true } });
    }
  };

  return (
    <div className="flex gap-2">
      {sorted.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => handleToggle(opt)}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border-2 transition-colors ${
            opt.isCorrect
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
          }`}
        >
          {opt.optionText}
          {opt.isCorrect && ' ✓'}
        </button>
      ))}
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  lessonId,
}: {
  question: InteractiveQuestion;
  index: number;
  lessonId: string;
}) {
  const updateQuestion = useUpdateQuestion(lessonId);
  const deleteQuestion = useDeleteQuestion(lessonId);
  const createOption = useCreateOption(lessonId);

  const [qText, setQText] = useState(question.questionText);
  const [qType, setQType] = useState<QuestionType>(question.questionType);
  const [explanation, setExplanation] = useState(question.explanation ?? '');
  const [score, setScore] = useState(String(question.score));
  const [showExplanation, setShowExplanation] = useState(false);
  const [saveError, setSaveError] = useState('');
  const newOptionInputRef = useRef<HTMLInputElement>(null);
  const [addingOption, setAddingOption] = useState(false);
  const [newOptionText, setNewOptionText] = useState('');
  const [newOptionCorrect, setNewOptionCorrect] = useState(false);

  const hasOptions = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(qType);
  const isTrueFalse = qType === 'TRUE_FALSE';
  const sortedOptions = question.options.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  const handleSave = useCallback(() => {
    if (!qText.trim()) { setSaveError('Асуултын текст оруулна уу'); return; }
    setSaveError('');
    updateQuestion.mutate({
      questionId: question.id,
      dto: {
        questionType: qType,
        questionText: qText.trim(),
        explanation: explanation.trim() || null,
        score: score ? Number(score) : 1,
      },
    });
  }, [qText, qType, explanation, score, question.id, updateQuestion]);

  const handleTypeChange = (newType: QuestionType) => {
    setQType(newType);
    // Immediately save type change
    updateQuestion.mutate({
      questionId: question.id,
      dto: { questionType: newType },
    });

    // Auto-create TRUE_FALSE options if switching to it and none exist
    if (newType === 'TRUE_FALSE' && question.options.length === 0) {
      createOption.mutate({ questionId: question.id, dto: { optionText: 'Үнэн', isCorrect: true, sortOrder: 1 } });
      createOption.mutate({ questionId: question.id, dto: { optionText: 'Худал', isCorrect: false, sortOrder: 2 } });
    }
  };

  const handleScoreChange = (val: string) => {
    setScore(val);
    if (val !== '') {
      updateQuestion.mutate({ questionId: question.id, dto: { score: Number(val) } });
    }
  };

  const handleDelete = () => {
    if (!window.confirm(`"${question.questionText}" асуултыг устгах уу?`)) return;
    deleteQuestion.mutate(question.id);
  };

  const handleAddOption = () => {
    if (!newOptionText.trim()) return;
    createOption.mutate(
      {
        questionId: question.id,
        dto: {
          optionText: newOptionText.trim(),
          isCorrect: newOptionCorrect,
          sortOrder: sortedOptions.length + 1,
        },
      },
      {
        onSuccess: () => {
          setNewOptionText('');
          setNewOptionCorrect(false);
          // Keep adding mode open, refocus
          setTimeout(() => newOptionInputRef.current?.focus(), 50);
        },
      },
    );
  };

  const handleNewOptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
    if (e.key === 'Escape') {
      setAddingOption(false);
      setNewOptionText('');
    }
  };

  const startAddingOption = () => {
    setAddingOption(true);
    setTimeout(() => newOptionInputRef.current?.focus(), 50);
  };

  // When an existing option row presses Enter, add a new option
  const handleOptionEnterKey = () => startAddingOption();

  useEffect(() => {
    if (addingOption) {
      newOptionInputRef.current?.focus();
    }
  }, [addingOption]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Question header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
          Q{index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <textarea
            value={qText}
            onChange={e => setQText(e.target.value)}
            onBlur={() => {
              if (qText.trim() && qText.trim() !== question.questionText) handleSave();
            }}
            rows={2}
            className="w-full text-sm font-medium text-slate-800 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none resize-none transition-colors placeholder:text-slate-400"
            placeholder="Асуултын текст оруулна уу..."
            style={{ minHeight: '2.5rem' }}
          />
          {saveError && <p className="text-xs text-red-500 mt-1">{saveError}</p>}
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteQuestion.isPending}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm"
          title="Устгах"
        >
          🗑
        </button>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 px-4 pb-3 flex-wrap">
        <select
          value={qType}
          onChange={e => handleTypeChange(e.target.value as QuestionType)}
          className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-600"
        >
          {QUESTION_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">Оноо:</span>
          <input
            type="number"
            value={score}
            onChange={e => handleScoreChange(e.target.value)}
            className="w-14 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
            min="0"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowExplanation(v => !v)}
          className="text-xs text-slate-400 hover:text-slate-600 underline"
        >
          {showExplanation ? 'Тайлбар нуух' : 'Тайлбар нэмэх'}
        </button>
      </div>

      {/* Explanation */}
      {showExplanation && (
        <div className="px-4 pb-3">
          <input
            type="text"
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            onBlur={() => {
              updateQuestion.mutate({ questionId: question.id, dto: { explanation: explanation.trim() || null } });
            }}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
            placeholder="Хариултын тайлбар..."
          />
        </div>
      )}

      {/* Options */}
      {hasOptions && (
        <div className="px-4 pb-3 space-y-1">
          <div className="w-full h-px bg-slate-100 mb-2" />

          {isTrueFalse ? (
            <TrueFalseOptions options={sortedOptions} lessonId={lessonId} />
          ) : (
            <>
              <div className="space-y-0.5">
                {sortedOptions.map(opt => (
                  <OptionRow
                    key={opt.id}
                    option={opt}
                    lessonId={lessonId}
                    questionType={qType}
                    onEnterKey={handleOptionEnterKey}
                  />
                ))}
              </div>

              {/* Add option inline */}
              {addingOption ? (
                <div className="flex items-center gap-2 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setNewOptionCorrect(v => !v)}
                    title="Зөв хариулт тэмдэглэх"
                    className={`w-4 h-4 rounded${qType === 'SINGLE_CHOICE' ? '-full' : ''} border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      newOptionCorrect
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 hover:border-emerald-400'
                    }`}
                  >
                    {newOptionCorrect && qType !== 'SINGLE_CHOICE' && (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 10">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <input
                    ref={newOptionInputRef}
                    type="text"
                    value={newOptionText}
                    onChange={e => setNewOptionText(e.target.value)}
                    onKeyDown={handleNewOptionKeyDown}
                    className="flex-1 px-2 py-1 text-sm border-0 border-b border-indigo-400 focus:outline-none bg-transparent"
                    placeholder="Шинэ сонголт... (Enter нэмэх)"
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    disabled={createOption.isPending}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex-shrink-0"
                  >
                    Нэмэх
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingOption(false); setNewOptionText(''); }}
                    className="text-xs text-slate-400 hover:text-slate-600 flex-shrink-0"
                  >
                    Болих
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startAddingOption}
                  className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  + Хариулт нэмэх
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Save button */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <div className="flex-1 h-px bg-slate-100" />
        <button
          type="button"
          onClick={handleSave}
          disabled={updateQuestion.isPending}
          className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
        >
          {updateQuestion.isPending ? 'Хадгалж байна...' : 'Хадгалах'}
        </button>
      </div>
    </div>
  );
}

// ─── Quiz Builder ─────────────────────────────────────────────────────────────

function QuizBuilder({
  block,
  lessonId,
}: {
  block: InteractiveBlock;
  lessonId: string;
}) {
  const createQuestion = useCreateQuestion(lessonId);
  const [adding, setAdding] = useState(false);

  const sortedQuestions = block.questions.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  const handleAddQuestion = () => {
    setAdding(true);
    createQuestion.mutate(
      {
        blockId: block.id,
        dto: {
          questionType: 'SINGLE_CHOICE',
          questionText: '',
          score: 1,
          sortOrder: sortedQuestions.length + 1,
        },
      },
      { onSettled: () => setAdding(false) },
    );
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-px flex-1 bg-slate-100" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2">Асуулт</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>

      {sortedQuestions.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-2">Асуулт байхгүй байна</p>
      ) : (
        <div className="space-y-3">
          {sortedQuestions.map((q, i) => (
            <QuestionCard key={q.id} question={q} index={i} lessonId={lessonId} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleAddQuestion}
        disabled={adding || createQuestion.isPending}
        className="w-full py-2.5 border-2 border-dashed border-indigo-200 rounded-xl text-sm text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50 transition-colors font-medium"
      >
        {adding ? 'Нэмж байна...' : '+ Асуулт нэмэх'}
      </button>
    </div>
  );
}

// ─── Block Settings (inline) ──────────────────────────────────────────────────

function BlockSettings({
  block,
  lessonId,
  onClose,
}: {
  block: InteractiveBlock;
  lessonId: string;
  onClose: () => void;
}) {
  const updateBlock = useUpdateBlock(lessonId);

  const [editBlockType, setEditBlockType] = useState<InteractiveBlockType>(block.blockType);
  const [editTitle, setEditTitle] = useState(block.title ?? '');
  const [editIsRequired, setEditIsRequired] = useState(block.isRequired);
  const [editPassingScore, setEditPassingScore] = useState(
    block.passingScore != null ? String(block.passingScore) : '',
  );
  const [editUnlockNext, setEditUnlockNext] = useState(block.unlockNextContent);
  const [editContinueOnPass, setEditContinueOnPass] = useState(block.continueOnPassOnly);
  const [editTriggerSecond, setEditTriggerSecond] = useState(
    block.triggerSecond != null ? String(block.triggerSecond) : '',
  );
  const [editTriggerPage, setEditTriggerPage] = useState(
    block.triggerPage != null ? String(block.triggerPage) : '',
  );
  const [editTriggerParagraph, setEditTriggerParagraph] = useState(
    block.triggerParagraph != null ? String(block.triggerParagraph) : '',
  );
  const [editError, setEditError] = useState('');

  const handleSave = () => {
    setEditError('');
    updateBlock.mutate(
      {
        blockId: block.id,
        dto: {
          blockType: editBlockType,
          title: editTitle.trim() || null,
          isRequired: editIsRequired,
          passingScore: editPassingScore !== '' ? Number(editPassingScore) : null,
          unlockNextContent: editUnlockNext,
          continueOnPassOnly: editContinueOnPass,
          triggerSecond: editTriggerSecond ? Number(editTriggerSecond) : null,
          triggerPage: editTriggerPage ? Number(editTriggerPage) : null,
          triggerParagraph: editTriggerParagraph ? Number(editTriggerParagraph) : null,
        },
      },
      {
        onSuccess: () => onClose(),
        onError: (e) => setEditError(e.message),
      },
    );
  };

  return (
    <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Блокийн тохиргоо</p>
      {editError && <p className="text-xs text-red-500">{editError}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Төрөл</label>
          <select
            value={editBlockType}
            onChange={e => setEditBlockType(e.target.value as InteractiveBlockType)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {BLOCK_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Гарчиг</label>
          <input
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Блокийн гарчиг"
          />
        </div>
      </div>

      {/* Trigger row */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Эхлэх нөхцөл</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Видео сек</label>
            <input
              type="number"
              value={editTriggerSecond}
              onChange={e => {
                setEditTriggerSecond(e.target.value);
                if (e.target.value) { setEditTriggerPage(''); setEditTriggerParagraph(''); }
              }}
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="секунд"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">PDF хуудас</label>
            <input
              type="number"
              value={editTriggerPage}
              onChange={e => {
                setEditTriggerPage(e.target.value);
                if (e.target.value) { setEditTriggerSecond(''); setEditTriggerParagraph(''); }
              }}
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="хуудас"
              min="1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Параграф</label>
            <input
              type="number"
              value={editTriggerParagraph}
              onChange={e => {
                setEditTriggerParagraph(e.target.value);
                if (e.target.value) { setEditTriggerSecond(''); setEditTriggerPage(''); }
              }}
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="параграф"
              min="1"
            />
          </div>
        </div>
      </div>

      {/* Passing score + checkboxes */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 whitespace-nowrap">Дааврын оноо:</label>
          <input
            type="number"
            value={editPassingScore}
            onChange={e => setEditPassingScore(e.target.value)}
            className="w-16 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
            placeholder="—"
            min="0"
            max="100"
          />
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600">
          <input type="checkbox" checked={editIsRequired} onChange={e => setEditIsRequired(e.target.checked)} className="accent-indigo-600" />
          Заавал
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600">
          <input type="checkbox" checked={editUnlockNext} onChange={e => setEditUnlockNext(e.target.checked)} className="accent-indigo-600" />
          Дараагийг нээх
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600">
          <input type="checkbox" checked={editContinueOnPass} onChange={e => setEditContinueOnPass(e.target.checked)} className="accent-indigo-600" />
          Дааврыг биелүүлбэл л үргэлжлүүлэх
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={updateBlock.isPending}
          className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {updateBlock.isPending ? 'Хадгалж байна...' : 'Хадгалах'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-100 transition-colors"
        >
          Болих
        </button>
      </div>
    </div>
  );
}

// ─── Block Card ───────────────────────────────────────────────────────────────

function BlockCard({
  block,
  lessonId,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  block: InteractiveBlock;
  lessonId: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editingSettings, setEditingSettings] = useState(false);
  const deleteBlock = useDeleteBlock(lessonId);

  const showQuizBuilder = block.blockType === 'QUIZ' || block.blockType === 'CHECKPOINT';
  const trigger = formatTrigger(block);
  const blockMeta = BLOCK_TYPES.find(t => t.value === block.blockType);

  const handleDelete = () => {
    if (!window.confirm('Энэ блокийг устгах уу?')) return;
    deleteBlock.mutate(block.id);
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${BLOCK_TYPE_COLORS[block.blockType]}`}>
          {blockMeta?.icon} {blockMeta?.label}
        </span>
        <span className="text-sm font-medium text-slate-700 flex-1 truncate min-w-0">
          {block.title ?? 'Нэргүй блок'}
        </span>
        {trigger && (
          <span className="text-xs text-slate-400 flex-shrink-0">{trigger}</span>
        )}
        {block.isRequired && (
          <span className="text-xs text-red-400 flex-shrink-0">*заавал</span>
        )}
        {block.passingScore != null && (
          <span className="text-xs text-slate-400 flex-shrink-0">{block.passingScore}% даавар</span>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          <button
            type="button"
            onClick={() => setEditingSettings(v => !v)}
            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
              editingSettings
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            Засах
          </button>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 disabled:opacity-30 transition-all text-sm"
            title="Дээш"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 disabled:opacity-30 transition-all text-sm"
            title="Доош"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteBlock.isPending}
            className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 disabled:opacity-50 transition-all text-sm"
            title="Устгах"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-3">
        {/* Inline settings */}
        {editingSettings && (
          <BlockSettings
            block={block}
            lessonId={lessonId}
            onClose={() => setEditingSettings(false)}
          />
        )}

        {/* Quiz builder */}
        {showQuizBuilder && (
          <QuizBuilder block={block} lessonId={lessonId} />
        )}

        {/* Non-quiz block info */}
        {!showQuizBuilder && !editingSettings && (
          <p className="text-xs text-slate-400 italic py-1">
            {block.blockType === 'INFO' && 'Мэдээллийн блок — агуулгыг contentJson-д хадгалагдана'}
            {block.blockType === 'ASSIGNMENT' && 'Даалгаврын блок — оюутанд даалгавар өгнө'}
            {block.blockType === 'AI_PROMPT' && 'AI асуултын блок — AI туслахтай харилцана'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── New Block Form ───────────────────────────────────────────────────────────

function NewBlockForm({
  lessonId,
  nextSortOrder,
  onClose,
}: {
  lessonId: string;
  nextSortOrder: number;
  onClose: () => void;
}) {
  const createBlock = useCreateBlock(lessonId);
  const [blockType, setBlockType] = useState<InteractiveBlockType>('QUIZ');
  const [title, setTitle] = useState('');
  const [triggerSecond, setTriggerSecond] = useState('');
  const [triggerPage, setTriggerPage] = useState('');
  const [triggerParagraph, setTriggerParagraph] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [passingScore, setPassingScore] = useState('');
  const [unlockNext, setUnlockNext] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = () => {
    setError('');
    createBlock.mutate(
      {
        blockType,
        title: title.trim() || null,
        sortOrder: nextSortOrder,
        isRequired,
        passingScore: passingScore !== '' ? Number(passingScore) : null,
        unlockNextContent: unlockNext,
        triggerSecond: triggerSecond ? Number(triggerSecond) : null,
        triggerPage: triggerPage ? Number(triggerPage) : null,
        triggerParagraph: triggerParagraph ? Number(triggerParagraph) : null,
      },
      {
        onSuccess: () => onClose(),
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <div className="border-2 border-indigo-200 rounded-xl p-5 space-y-4 bg-indigo-50/40">
      <p className="text-sm font-semibold text-slate-700">Шинэ блок нэмэх</p>
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Block type visual cards */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">Блокийн төрөл</label>
        <div className="grid grid-cols-5 gap-2">
          {BLOCK_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setBlockType(t.value)}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-xs font-medium transition-colors ${
                blockType === t.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Гарчиг (сонголтоор)</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Блокийн гарчиг..."
        />
      </div>

      {/* Trigger */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Эхлэх нөхцөл</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Видео сек</label>
            <input
              type="number"
              value={triggerSecond}
              onChange={e => { setTriggerSecond(e.target.value); if (e.target.value) { setTriggerPage(''); setTriggerParagraph(''); } }}
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="секунд"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">PDF хуудас</label>
            <input
              type="number"
              value={triggerPage}
              onChange={e => { setTriggerPage(e.target.value); if (e.target.value) { setTriggerSecond(''); setTriggerParagraph(''); } }}
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="хуудас"
              min="1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Параграф</label>
            <input
              type="number"
              value={triggerParagraph}
              onChange={e => { setTriggerParagraph(e.target.value); if (e.target.value) { setTriggerSecond(''); setTriggerPage(''); } }}
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="параграф"
              min="1"
            />
          </div>
        </div>
      </div>

      {/* Options row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 whitespace-nowrap">Дааврын оноо:</label>
          <input
            type="number"
            value={passingScore}
            onChange={e => setPassingScore(e.target.value)}
            className="w-16 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
            placeholder="—"
            min="0"
            max="100"
          />
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600">
          <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} className="accent-indigo-600" />
          Заавал
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600">
          <input type="checkbox" checked={unlockNext} onChange={e => setUnlockNext(e.target.checked)} className="accent-indigo-600" />
          Дараагийг нээх
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleCreate}
          disabled={createBlock.isPending}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {createBlock.isPending ? 'Нэмж байна...' : 'Блок үүсгэх'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
        >
          Болих
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface InteractiveBlocksEditorProps {
  lessonId: string;
}

export function InteractiveBlocksEditor({ lessonId }: InteractiveBlocksEditorProps) {
  const { data: blocksData, isLoading } = useInteractiveBlocks(lessonId);
  const updateBlock = useUpdateBlock(lessonId);
  const [addingBlock, setAddingBlock] = useState(false);

  const blocks = blocksData?.data ?? [];
  const sortedBlocks = blocks.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  const handleMoveUp = (block: InteractiveBlock, index: number) => {
    if (index === 0) return;
    const prevBlock = sortedBlocks[index - 1];
    updateBlock.mutate({ blockId: block.id, dto: { sortOrder: prevBlock.sortOrder } });
    updateBlock.mutate({ blockId: prevBlock.id, dto: { sortOrder: block.sortOrder } });
  };

  const handleMoveDown = (block: InteractiveBlock, index: number) => {
    if (index === sortedBlocks.length - 1) return;
    const nextBlock = sortedBlocks[index + 1];
    updateBlock.mutate({ blockId: block.id, dto: { sortOrder: nextBlock.sortOrder } });
    updateBlock.mutate({ blockId: nextBlock.id, dto: { sortOrder: block.sortOrder } });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Интерактив блокууд</h2>
          {!isLoading && (
            <p className="text-xs text-slate-400 mt-0.5">{sortedBlocks.length} блок</p>
          )}
        </div>
        {!addingBlock && (
          <button
            type="button"
            onClick={() => setAddingBlock(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + Блок нэмэх
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {sortedBlocks.length === 0 && !addingBlock && (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-slate-400 text-sm">Интерактив блок байхгүй байна</p>
              <button
                type="button"
                onClick={() => setAddingBlock(true)}
                className="mt-3 text-sm text-indigo-600 hover:underline"
              >
                Эхний блокоо нэмэх
              </button>
            </div>
          )}

          {sortedBlocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              lessonId={lessonId}
              isFirst={index === 0}
              isLast={index === sortedBlocks.length - 1}
              onMoveUp={() => handleMoveUp(block, index)}
              onMoveDown={() => handleMoveDown(block, index)}
            />
          ))}

          {addingBlock && (
            <NewBlockForm
              lessonId={lessonId}
              nextSortOrder={sortedBlocks.length + 1}
              onClose={() => setAddingBlock(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
