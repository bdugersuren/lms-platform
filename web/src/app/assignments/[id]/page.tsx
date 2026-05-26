'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  useAssignment,
  useMySubmission,
  useSaveDraft,
  useSubmitAssignment,
} from '@/hooks/use-assignment';
import { clsx } from 'clsx';
import type { SubmissionStatus } from '@/types/assignment';
import { CodeSubmissionPanel } from '@/components/assignment/code-submission-panel';

const statusMeta: Record<SubmissionStatus, { label: string; cls: string; icon: string }> = {
  DRAFT: { label: 'Ноорог', cls: 'bg-gray-100 text-gray-600', icon: '📝' },
  SUBMITTED: { label: 'Илгээсэн', cls: 'bg-blue-100 text-blue-700', icon: '📤' },
  UNDER_REVIEW: { label: 'Шалгаж байна', cls: 'bg-amber-100 text-amber-700', icon: '🔍' },
  GRADED: { label: 'Дүгнэгдсэн', cls: 'bg-green-100 text-green-700', icon: '✅' },
  RETURNED: { label: 'Буцаасан', cls: 'bg-red-100 text-red-700', icon: '↩️' },
};

export default function AssignmentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: assignment, isLoading } = useAssignment(id);
  const { data: submission, isError: noSubmission } = useMySubmission(id);

  const saveDraft = useSaveDraft(id);
  const submitAssignment = useSubmitAssignment(id);

  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [submitConfirm, setSubmitConfirm] = useState(false);

  const isEditable = !submission || submission.status === 'DRAFT' || submission.status === 'RETURNED';
  const canSubmit = isEditable && (content.trim() || linkUrl.trim());
  const isOverdue = assignment?.dueDate ? new Date(assignment.dueDate) < new Date() : false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-500">
        Даалгавар олдсонгүй.
      </div>
    );
  }

  const handleSaveDraft = async () => {
    await saveDraft.mutateAsync({ content: content || undefined, linkUrl: linkUrl || undefined });
  };

  const handleSubmit = async () => {
    if (!submitConfirm) { setSubmitConfirm(true); return; }
    await submitAssignment.mutateAsync();
    setSubmitConfirm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/assignments" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-semibold text-gray-900 truncate">{assignment.title}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Assignment info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">{assignment.title}</h2>
              {assignment.description && (
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{assignment.description}</p>
              )}
            </div>
            <span
              className={clsx(
                'ml-3 flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium',
                assignment.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
              )}
            >
              {assignment.isPublished ? 'Нийтлэгдсэн' : 'Ноорог'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-t border-b border-gray-50 my-4">
            <Stat icon="🏆" label="Дээд оноо" value={String(assignment.maxScore)} />
            <Stat icon="✅" label="Дамжих %" value={`${assignment.passingScore}%`} />
            <Stat icon="📁" label="Төрөл" value={{ TEXT: 'Текст', FILE_UPLOAD: 'Файл', LINK: 'Холбоос', CODE: 'Код' }[assignment.type] ?? assignment.type} />
            <Stat
              icon="📅"
              label="Дуусах өдөр"
              value={assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('mn-MN') : 'Хязгааргүй'}
              warn={isOverdue}
            />
          </div>

          {isOverdue && !assignment.allowLate && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600">
              ⚠️ Хугацаа дууссан. Хоцрогдол хүлээхгүй.
            </div>
          )}
          {isOverdue && assignment.allowLate && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700">
              ⏰ Хугацаа дууссан ч хоцрогдсон илгээлт хүлээж авна.
            </div>
          )}
        </div>

        {/* Submission area */}
        {assignment.isPublished && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Миний ажил</h3>
              {submission && (
                <span className={clsx('flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', statusMeta[submission.status].cls)}>
                  {statusMeta[submission.status].icon} {statusMeta[submission.status].label}
                </span>
              )}
            </div>

            {/* Grade result */}
            {submission?.grade && (
              <div className={clsx(
                'mb-5 p-4 rounded-xl border',
                submission.grade.score >= assignment.passingScore
                  ? 'bg-green-50 border-green-100'
                  : 'bg-red-50 border-red-100',
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {submission.grade.score >= assignment.passingScore ? '🎉 Тэнцсэн!' : '❌ Тэнцээгүй'}
                    </p>
                    {submission.grade.feedback && (
                      <p className="text-xs text-gray-600 mt-1">{submission.grade.feedback}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{submission.grade.score}</p>
                    <p className="text-xs text-gray-400">/ {submission.grade.maxScore}</p>
                  </div>
                </div>
              </div>
            )}

            {assignment.type === 'CODE' ? (
              <CodeSubmissionPanel assignmentId={id} />
            ) : isEditable ? (
              <div className="space-y-4">
                {assignment.type === 'TEXT' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Хариулт</label>
                    <textarea
                      rows={8}
                      value={content || submission?.content || ''}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Хариултаа бичнэ үү..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                )}

                {assignment.type === 'LINK' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Холбоос (URL)</label>
                    <input
                      type="url"
                      value={linkUrl || submission?.linkUrl || ''}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {assignment.type === 'FILE_UPLOAD' && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                    <p className="text-2xl mb-2">📎</p>
                    <p className="text-sm">Файл байршуулах функц Media Service-тэй холбосны дараа идэвхжинэ.</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSaveDraft}
                    disabled={saveDraft.isPending}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {saveDraft.isPending ? 'Хадгалж байна...' : 'Ноорог хадгалах'}
                  </button>

                  {!submitConfirm ? (
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit || submitAssignment.isPending}
                      className={clsx(
                        'px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors',
                        canSubmit ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed',
                      )}
                    >
                      Илгээх
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-600">Баталгаажуулах уу?</span>
                      <button
                        onClick={handleSubmit}
                        disabled={submitAssignment.isPending}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {submitAssignment.isPending ? 'Илгээж байна...' : 'Тийм, илгээх'}
                      </button>
                      <button
                        onClick={() => setSubmitConfirm(false)}
                        className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Болих
                      </button>
                    </div>
                  )}
                </div>

                {(saveDraft.isError || submitAssignment.isError) && (
                  <p className="text-sm text-red-500">
                    {(saveDraft.error ?? submitAssignment.error)?.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {submission?.content && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Илгээсэн хариулт:</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{submission.content}</p>
                  </div>
                )}
                {submission?.linkUrl && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Илгээсэн холбоос:</p>
                    <a href={submission.linkUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline break-all">
                      {submission.linkUrl}
                    </a>
                  </div>
                )}
                {submission?.submittedAt && (
                  <p className="text-xs text-gray-400">
                    Илгээсэн: {new Date(submission.submittedAt).toLocaleString('mn-MN')}
                    {submission.isLate && <span className="ml-2 text-amber-500">(Хоцорсон)</span>}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, label, value, warn }: { icon: string; label: string; value: string; warn?: boolean }) {
  return (
    <div className="text-center">
      <span className="text-xl">{icon}</span>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      <p className={clsx('text-sm font-bold mt-0.5', warn ? 'text-red-500' : 'text-gray-900')}>{value}</p>
    </div>
  );
}
