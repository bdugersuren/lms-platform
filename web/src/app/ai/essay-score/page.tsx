'use client';

import { useState } from 'react';
import { useScoreEssay, useEssayHistory } from '@/hooks/use-ai';
import type { EssayScore } from '@/types/ai';

function ScoreGauge({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = Math.round((score / maxScore) * 100);
  const color = pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="text-center">
      <div className={`text-5xl font-bold ${color}`}>{pct}%</div>
      <div className="text-slate-400 text-sm mt-1">{score.toFixed(1)} / {maxScore}</div>
    </div>
  );
}

function RubricBar({ label, value, max = 25 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300 capitalize">{label}</span>
        <span className="text-slate-400">{value}/{max}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function EssayScorePage() {
  const [essayText, setEssayText] = useState('');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<EssayScore | null>(null);

  const scoreEssay = useScoreEssay();
  const { data: history = [] } = useEssayHistory();

  async function handleScore() {
    if (!essayText.trim()) return;
    const data = await scoreEssay.mutateAsync({ essayText, prompt: prompt || undefined });
    setResult(data);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <a href="/ai" className="text-slate-400 hover:text-white text-sm transition-colors">
              ← AI Tutor
            </a>
          </div>
          <h1 className="text-3xl font-bold">Essay Scorer</h1>
          <p className="text-slate-400 mt-2">
            Submit your essay for instant AI-powered feedback and scoring.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input panel */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Essay Prompt / Topic (optional)
              </label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Discuss the causes of World War I"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Essay
                <span className="text-slate-500 font-normal ml-2">({essayText.length} chars)</span>
              </label>
              <textarea
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                placeholder="Paste or write your essay here (minimum 50 characters)..."
                rows={16}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <button
              onClick={() => void handleScore()}
              disabled={scoreEssay.isPending || essayText.length < 50}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-colors"
            >
              {scoreEssay.isPending ? 'Scoring with AI...' : 'Score Essay'}
            </button>

            {scoreEssay.isError && (
              <p className="text-red-400 text-sm text-center">
                {scoreEssay.error?.message ?? 'Failed to score essay'}
              </p>
            )}
          </div>

          {/* Results panel */}
          <div className="space-y-4">
            {result ? (
              <>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h2 className="text-lg font-semibold mb-4 text-center">Score</h2>
                  <ScoreGauge score={result.score} maxScore={result.maxScore} />
                </div>

                {result.rubricBreakdown && (
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-3">
                    <h2 className="text-lg font-semibold mb-2">Rubric Breakdown</h2>
                    {Object.entries(result.rubricBreakdown).map(([key, val]) => (
                      <RubricBar key={key} label={key} value={val as number} />
                    ))}
                  </div>
                )}

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h2 className="text-lg font-semibold mb-3">AI Feedback</h2>
                  <p className="text-slate-300 text-sm leading-relaxed">{result.feedback}</p>
                </div>
              </>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex items-center justify-center min-h-48">
                <div className="text-center text-slate-500">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="text-sm">Your score and feedback will appear here</p>
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Recent Scores</h3>
                <div className="space-y-2">
                  {history.slice(0, 5).map((item: EssayScore) => {
                    const pct = Math.round((item.score / item.maxScore) * 100);
                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-400 text-xs">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        <span
                          className={`font-medium ${
                            pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
