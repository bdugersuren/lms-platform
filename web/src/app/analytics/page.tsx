'use client';

import { useState } from 'react';
import {
  useAnalyticsOverview,
  useAnalyticsTimeSeries,
  useAnalyticsEvents,
  useEventBreakdown,
  useUserActivity,
} from '@/hooks/use-analytics';
import type { TimeSeriesPoint, UserActivityPoint } from '@/types/analytics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function eventLabel(type: string) {
  const map: Record<string, string> = {
    'auth.user.registered':           '👤 User Registered',
    'enrollment.created':             '📚 Enrolled',
    'enrollment.completed':           '🎓 Course Completed',
    'payment.confirmed':              '💳 Payment',
    'payment.failed':                 '❌ Payment Failed',
    'quiz.attempt.completed':         '📝 Quiz Completed',
    'assignment.submission.graded':   '✍️ Assignment Graded',
    'media.file.uploaded':            '📁 Media Uploaded',
    'certificate.issued':             '🏆 Certificate Issued',
  };
  return map[type] ?? `⚡ ${type}`;
}

// ─── Inline SVG Line Chart ────────────────────────────────────────────────────

function LineChart({
  data,
  getValue,
  color = '#3b82f6',
  label,
  height = 100,
}: {
  data: (TimeSeriesPoint | UserActivityPoint)[];
  getValue: (d: TimeSeriesPoint | UserActivityPoint) => number;
  color?: string;
  label?: string;
  height?: number;
}) {
  if (data.length === 0) return <div className="text-center text-gray-400 text-sm py-4">No data</div>;

  const values = data.map(getValue);
  const max = Math.max(...values, 1);
  const width = 600;
  const pad = { t: 10, r: 10, b: 24, l: 30 };
  const W = width - pad.l - pad.r;
  const H = height - pad.t - pad.b;

  const pts = data.map((d, i) => ({
    x: pad.l + (i / (data.length - 1 || 1)) * W,
    y: pad.t + H - (getValue(d) / max) * H,
    value: getValue(d),
    date: d.date,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${(pad.t + H).toFixed(1)} L ${pad.l} ${(pad.t + H).toFixed(1)} Z`;

  // x-axis labels: show ~6 labels
  const step = Math.max(1, Math.floor(data.length / 6));
  const xLabels = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {/* Area fill */}
      <defs>
        <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${label})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

      {/* Data points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} opacity={0.7}>
          <title>{`${fmtDate(p.date)}: ${p.value}`}</title>
        </circle>
      ))}

      {/* X axis */}
      <line x1={pad.l} y1={pad.t + H} x2={pad.l + W} y2={pad.t + H} stroke="#e5e7eb" />
      {xLabels.map((p, i) => (
        <text key={i} x={p.x} y={height - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">
          {fmtDate(p.date)}
        </text>
      ))}

      {/* Y axis max label */}
      <text x={pad.l - 4} y={pad.t + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{fmtNum(max)}</text>
    </svg>
  );
}

// ─── Bar Chart (event breakdown) ──────────────────────────────────────────────

function HBarChart({ items }: { items: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className="w-44 text-xs text-gray-600 truncate shrink-0">{item.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-4 rounded-full transition-all duration-500"
              style={{ width: `${(item.value / max) * 100}%`, background: item.color }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700 w-10 text-right">{fmtNum(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, sub, color = 'bg-blue-50 text-blue-700',
}: {
  label: string; value: string | number; icon: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <span className={`text-xl rounded-xl p-1.5 ${color}`}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{typeof value === 'number' ? fmtNum(value) : value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AnalyticsDashboardPage() {
  const [days, setDays] = useState(30);
  const [activeChart, setActiveChart] = useState<'users' | 'enrollments' | 'revenue' | 'quizzes'>('users');

  const { data: overview, isLoading: ovLoading } = useAnalyticsOverview();
  const { data: timeSeries = [] } = useAnalyticsTimeSeries(days);
  const { data: eventsPage } = useAnalyticsEvents({ limit: 20 });
  const { data: breakdown = [] } = useEventBreakdown();
  const { data: userActivity = [] } = useUserActivity(days);

  const CHART_CONFIG = {
    users:       { label: 'New Users',      getValue: (d: TimeSeriesPoint) => d.newUsers,       color: '#6366f1' },
    enrollments: { label: 'Enrollments',    getValue: (d: TimeSeriesPoint) => d.newEnrollments, color: '#10b981' },
    revenue:     { label: 'Revenue (₮)',    getValue: (d: TimeSeriesPoint) => d.revenue,         color: '#f59e0b' },
    quizzes:     { label: 'Quiz Attempts',  getValue: (d: TimeSeriesPoint) => d.quizAttempts,   color: '#ef4444' },
  } as const;

  const EVENT_COLORS: Record<string, string> = {
    'auth.user.registered':         '#6366f1',
    'enrollment.created':           '#10b981',
    'enrollment.completed':         '#059669',
    'payment.confirmed':            '#f59e0b',
    'payment.failed':               '#ef4444',
    'quiz.attempt.completed':       '#3b82f6',
    'assignment.submission.graded': '#8b5cf6',
    'media.file.uploaded':          '#14b8a6',
    'certificate.issued':           '#f97316',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Real-time platform metrics from all services</p>
          </div>
          <div className="flex gap-2">
            {([7, 14, 30, 90] as const).map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  days === d ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        {ovLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border rounded-2xl p-5 animate-pulse h-28">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : overview ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Total Users" value={overview.totalUsers} icon="👤" color="bg-indigo-50 text-indigo-700" />
            <KpiCard label="Enrollments" value={overview.totalEnrollments} icon="📚" color="bg-green-50 text-green-700"
              sub={`${overview.completionRate}% completion rate`} />
            <KpiCard label="Revenue" value={`₮${fmtNum(overview.totalRevenue)}`} icon="💰" color="bg-amber-50 text-amber-700"
              sub={`${overview.confirmedPayments} payments`} />
            <KpiCard label="Quiz Attempts" value={overview.quizAttempts} icon="📝" color="bg-blue-50 text-blue-700"
              sub={overview.avgQuizScore !== null ? `Avg score: ${overview.avgQuizScore}%` : undefined} />
            <KpiCard label="Courses Completed" value={overview.completedCourses} icon="🎓" color="bg-emerald-50 text-emerald-700" />
            <KpiCard label="Certificates Issued" value={overview.certificatesIssued} icon="🏆" color="bg-orange-50 text-orange-700" />
            <KpiCard label="Assignments Graded" value={overview.assignmentSubmissions} icon="✍️" color="bg-purple-50 text-purple-700" />
            <KpiCard label="Media Uploads" value={overview.mediaUploads} icon="📁" color="bg-teal-50 text-teal-700" />
          </div>
        ) : null}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

          {/* Main trend chart */}
          <div className="lg:col-span-2 bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Trends — last {days} days</h2>
              <div className="flex gap-1">
                {(Object.entries(CHART_CONFIG) as [typeof activeChart, typeof CHART_CONFIG[typeof activeChart]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setActiveChart(key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      activeChart === key ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={activeChart === key ? { background: cfg.color } : {}}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <LineChart
              data={timeSeries}
              getValue={CHART_CONFIG[activeChart].getValue as (d: TimeSeriesPoint | UserActivityPoint) => number}
              color={CHART_CONFIG[activeChart].color}
              label={activeChart}
              height={160}
            />
          </div>

          {/* Active users chart */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Daily Active Users</h2>
            <LineChart
              data={userActivity}
              getValue={(d) => (d as UserActivityPoint).activeUsers}
              color="#8b5cf6"
              label="active-users"
              height={160}
            />
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Event breakdown */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Event Breakdown (all time)</h2>
            {breakdown.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No events recorded yet</p>
            ) : (
              <HBarChart
                items={breakdown.map(b => ({
                  label: eventLabel(b.eventType),
                  value: b.count,
                  color: EVENT_COLORS[b.eventType] ?? '#6b7280',
                }))}
              />
            )}
          </div>

          {/* Recent events feed */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">
              Recent Events
              {eventsPage && (
                <span className="ml-2 text-xs text-gray-400 font-normal">({eventsPage.total} total)</span>
              )}
            </h2>
            {!eventsPage || eventsPage.items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm text-gray-400">No events yet</p>
                <p className="text-xs text-gray-300 mt-1">Events will appear as users interact with the platform</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {eventsPage.items.map(e => (
                  <div key={e.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-base mt-0.5 shrink-0">
                      {eventLabel(e.eventType).split(' ')[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {eventLabel(e.eventType).slice(2)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                        <span>{fmtTime(e.occurredAt)}</span>
                        {e.userId && <span>· User {e.userId.slice(0, 8)}…</span>}
                        {e.courseId && <span>· Course {e.courseId.slice(0, 8)}…</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Data collected from all platform services via RabbitMQ • Refreshes every 30s
        </p>
      </div>
    </div>
  );
}
