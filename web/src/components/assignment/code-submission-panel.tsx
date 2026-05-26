'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { api } from '@/lib/api';

const LANGUAGES = [
  { code: 'CPP17', label: 'C++ 17' },
  { code: 'CPP14', label: 'C++ 14' },
  { code: 'PY3', label: 'Python 3' },
  { code: 'JAVA', label: 'Java' },
  { code: 'RUBY', label: 'Ruby' },
];

const STATUS_META: Record<string, { label: string; cls: string; icon: string }> = {
  QUEUED:    { label: 'Дараалалд', cls: 'bg-gray-100 text-gray-600', icon: '⏳' },
  SUBMITTED: { label: 'Илгээгдсэн', cls: 'bg-blue-100 text-blue-700', icon: '📤' },
  JUDGING:   { label: 'Шалгаж байна', cls: 'bg-amber-100 text-amber-700', icon: '🔍' },
  GRADED:    { label: 'Дүгнэгдсэн', cls: 'bg-green-100 text-green-700', icon: '✅' },
  FAILED:    { label: 'Алдаа', cls: 'bg-red-100 text-red-700', icon: '❌' },
};

interface CodeSubmission {
  id: string;
  language: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  timeMs: number | null;
  memoryKb: number | null;
  createdAt: string;
  cases?: Array<{
    caseNumber: number;
    status: string;
    timeMs: number | null;
    memoryKb: number | null;
    score: number | null;
    maxScore: number | null;
  }>;
}

interface ProblemInfo {
  assignmentId: string;
  dmojProblemCode: string;
  allowedLanguages: string[];
  maxScore: number;
  passingScore: number;
  isActive: boolean;
}

export function CodeSubmissionPanel({ assignmentId }: { assignmentId: string }) {
  const qc = useQueryClient();

  const [language, setLanguage] = useState('CPP17');
  const [code, setCode] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [pollingId, setPollingId] = useState<string | null>(null);

  const { data: problem, isError: noProblem } = useQuery<ProblemInfo>({
    queryKey: ['coding-problem', assignmentId],
    queryFn: () =>
      api.get<{ data: ProblemInfo }>(`/coding/assignments/${assignmentId}`).then((r) => r.data.data),
    retry: 1,
  });

  const { data: mySubmissions = [] } = useQuery<CodeSubmission[]>({
    queryKey: ['coding-submissions', assignmentId],
    queryFn: () =>
      api.get<{ data: CodeSubmission[] }>(`/coding/assignments/${assignmentId}/submissions/my`).then((r) => r.data.data),
  });

  const { data: pollingSubmission } = useQuery<CodeSubmission>({
    queryKey: ['coding-submission', pollingId],
    queryFn: () =>
      api.get<{ data: CodeSubmission }>(`/coding/submissions/${pollingId}`).then((r) => r.data.data),
    enabled: !!pollingId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === 'GRADED' || status === 'FAILED') return false;
      return 3000;
    },
  });

  useEffect(() => {
    if (pollingSubmission?.status === 'GRADED' || pollingSubmission?.status === 'FAILED') {
      void qc.invalidateQueries({ queryKey: ['coding-submissions', assignmentId] });
      setPollingId(null);
    }
  }, [pollingSubmission?.status, assignmentId, qc]);

  const submit = useMutation({
    mutationFn: () =>
      api.post<{ data: CodeSubmission }>(`/coding/assignments/${assignmentId}/submissions`, { language, code })
        .then((r) => r.data.data),
    onSuccess: (data: CodeSubmission) => {
      setPollingId(data.id);
      void qc.invalidateQueries({ queryKey: ['coding-submissions', assignmentId] });
    },
  });

  if (noProblem) {
    return (
      <div className="border-2 border-dashed border-amber-200 rounded-xl p-8 text-center text-amber-700 bg-amber-50">
        <p className="text-2xl mb-2">⚙️</p>
        <p className="text-sm font-medium">DMOJ судалгаа тохируулагдаагүй байна</p>
        <p className="text-xs mt-1 text-amber-600">Багш/Admin DMOJ асуудалтай холбоно уу.</p>
      </div>
    );
  }

  const allowedLangs = problem?.allowedLanguages?.length
    ? LANGUAGES.filter((l) => problem.allowedLanguages.includes(l.code))
    : LANGUAGES;

  const latestSubmission = mySubmissions[0] ?? null;
  const isPolling = !!pollingId && pollingSubmission && !['GRADED', 'FAILED'].includes(pollingSubmission.status);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['editor', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-xs font-medium transition-colors',
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab === 'editor' ? 'Код бичих' : `Түүх (${mySubmissions.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'editor' && (
        <div className="space-y-3">
          {/* Polling status banner */}
          {isPolling && pollingSubmission && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
              <span className="inline-block w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-amber-700 font-medium">
                Judge шалгаж байна... ({STATUS_META[pollingSubmission.status]?.label})
              </span>
            </div>
          )}

          {/* Latest graded result */}
          {latestSubmission?.status === 'GRADED' && (
            <div className={clsx(
              'p-4 rounded-xl border',
              (latestSubmission.score ?? 0) >= (problem?.passingScore ?? 60)
                ? 'bg-green-50 border-green-100'
                : 'bg-red-50 border-red-100',
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {(latestSubmission.score ?? 0) >= (problem?.passingScore ?? 60) ? '🎉 Тэнцсэн!' : '❌ Тэнцээгүй'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {latestSubmission.language}
                    {latestSubmission.timeMs && ` · ${latestSubmission.timeMs}ms`}
                    {latestSubmission.memoryKb && ` · ${latestSubmission.memoryKb}KB`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{latestSubmission.score ?? 0}</p>
                  <p className="text-xs text-gray-400">/ {latestSubmission.maxScore ?? problem?.maxScore ?? 100}</p>
                </div>
              </div>
            </div>
          )}

          {/* Language selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Програмчлалын хэл</label>
            <div className="flex flex-wrap gap-2">
              {allowedLangs.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-medium border transition-colors',
                    language === l.code
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 text-gray-600 hover:border-indigo-300',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Code editor */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Код</label>
            <textarea
              rows={14}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`// ${language} кодоо энд бичнэ үү\n`}
              spellCheck={false}
              className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-900 text-green-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>

          <button
            onClick={() => submit.mutate()}
            disabled={!code.trim() || submit.isPending || !!isPolling}
            className={clsx(
              'px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors',
              code.trim() && !submit.isPending && !isPolling
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-gray-300 cursor-not-allowed',
            )}
          >
            {submit.isPending ? 'Илгээж байна...' : 'Judge руу илгээх'}
          </button>

          {submit.isError && (
            <p className="text-sm text-red-500">{(submit.error as Error)?.message}</p>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          {mySubmissions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Илгээлт байхгүй байна.</p>
          )}
          {mySubmissions.map((sub) => (
            <SubmissionRow key={sub.id} submission={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionRow({ submission: sub }: { submission: CodeSubmission }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[sub.status] ?? STATUS_META.FAILED;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', meta.cls)}>
            {meta.icon} {meta.label}
          </span>
          <span className="text-xs text-gray-500">{sub.language}</span>
          {sub.timeMs && <span className="text-xs text-gray-400">{sub.timeMs}ms</span>}
        </div>
        <div className="flex items-center gap-3">
          {sub.status === 'GRADED' && (
            <span className="text-sm font-bold text-gray-800">
              {sub.score ?? 0}/{sub.maxScore ?? 100}
            </span>
          )}
          <span className="text-xs text-gray-400">{new Date(sub.createdAt).toLocaleString('mn-MN')}</span>
          <svg className={clsx('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && sub.cases && sub.cases.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Тест кейсүүд</p>
          <div className="space-y-1">
            {sub.cases.map((c) => (
              <div key={c.caseNumber} className="flex items-center gap-3 text-xs">
                <span className="w-6 text-gray-400">#{c.caseNumber}</span>
                <span className={clsx(
                  'px-1.5 py-0.5 rounded font-medium',
                  c.status === 'AC' ? 'bg-green-100 text-green-700' :
                  c.status === 'WA' ? 'bg-red-100 text-red-700' :
                  c.status === 'TLE' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600',
                )}>
                  {c.status}
                </span>
                {c.timeMs && <span className="text-gray-400">{c.timeMs}ms</span>}
                {c.memoryKb && <span className="text-gray-400">{c.memoryKb}KB</span>}
                {c.score !== null && <span className="ml-auto text-gray-600">{c.score}/{c.maxScore}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
