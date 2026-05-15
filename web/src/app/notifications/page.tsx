'use client';

import { useState } from 'react';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useDeleteNotification,
  useNotificationPreferences,
  useUpdatePreferences,
} from '@/hooks/use-notification';
import type { Notification, NotificationType } from '@/types/notification';

const TYPE_ICON: Record<NotificationType, string> = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  ASSIGNMENT_GRADED: '📝',
  COURSE_ENROLLED: '🎓',
  QUIZ_RESULT: '📊',
  PAYMENT_CONFIRMED: '💳',
  PAYMENT_FAILED: '❌',
  SYSTEM: '⚙️',
  INFO: 'ℹ️',
};

const TYPE_COLOR: Record<NotificationType, string> = {
  SUCCESS: 'text-green-400',
  ERROR: 'text-red-400',
  WARNING: 'text-yellow-400',
  ASSIGNMENT_GRADED: 'text-blue-400',
  COURSE_ENROLLED: 'text-indigo-400',
  QUIZ_RESULT: 'text-purple-400',
  PAYMENT_CONFIRMED: 'text-green-400',
  PAYMENT_FAILED: 'text-red-400',
  SYSTEM: 'text-slate-400',
  INFO: 'text-slate-400',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type Tab = 'all' | 'unread' | 'preferences';

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data: list, isLoading } = useNotifications({
    unreadOnly: tab === 'unread',
    limit,
    offset,
  });
  const { data: prefs } = useNotificationPreferences();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteNotif = useDeleteNotification();
  const updatePrefs = useUpdatePreferences();

  const items = list?.items ?? [];
  const total = list?.total ?? 0;
  const unreadCount = list?.unreadCount ?? 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-slate-400 mt-1">{unreadCount} unread</p>
            )}
          </div>
          {tab !== 'preferences' && unreadCount > 0 && (
            <button
              onClick={() => void markAllRead.mutateAsync()}
              disabled={markAllRead.isPending}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1 mb-6">
          {(['all', 'unread', 'preferences'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setOffset(0); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                tab === t
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'unread' && unreadCount > 0 ? `Unread (${unreadCount})` : t}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {tab !== 'preferences' && (
          <>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-slate-800 rounded-xl h-20 animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <div className="text-5xl mb-4">🔔</div>
                <p className="text-lg">
                  {tab === 'unread' ? 'All caught up!' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((n: Notification) => (
                  <div
                    key={n.id}
                    className={`group bg-slate-800 rounded-xl p-4 border transition-colors ${
                      !n.isRead
                        ? 'border-indigo-500/30 bg-indigo-500/5'
                        : 'border-slate-700'
                    }`}
                  >
                    <div className="flex gap-3">
                      <span className="text-xl flex-shrink-0 mt-0.5">
                        {TYPE_ICON[n.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-medium text-sm ${!n.isRead ? 'text-white' : 'text-slate-300'}`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!n.isRead && (
                              <span className={`text-xs font-medium ${TYPE_COLOR[n.type]}`}>NEW</span>
                            )}
                            <span className="text-xs text-slate-500">{timeAgo(n.createdAt)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{n.body}</p>
                        <div className="flex gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.isRead && (
                            <button
                              onClick={() => void markRead.mutateAsync(n.id)}
                              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => void deleteNotif.mutateAsync(n.id)}
                            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-400">
                  {offset + 1}–{Math.min(offset + limit, total)} of {total}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Preferences */}
        {tab === 'preferences' && prefs && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="font-semibold mb-4">Notification Channels</h2>
              <div className="space-y-3">
                {(
                  [
                    { key: 'inApp', label: 'In-App', desc: 'Show notifications inside the platform' },
                    { key: 'email', label: 'Email', desc: 'Send notifications to your email address' },
                    { key: 'sms', label: 'SMS', desc: 'Send SMS alerts to your phone' },
                    { key: 'push', label: 'Push', desc: 'Browser push notifications' },
                  ] as const
                ).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                    <Toggle
                      value={prefs[key]}
                      onChange={(v) => void updatePrefs.mutateAsync({ [key]: v })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="font-semibold mb-4">Notification Types</h2>
              <div className="space-y-3">
                {(
                  [
                    { key: 'assignmentGraded', label: 'Assignment graded', icon: '📝' },
                    { key: 'courseEnrolled', label: 'Course enrollment', icon: '🎓' },
                    { key: 'quizResult', label: 'Quiz results', icon: '📊' },
                    { key: 'paymentConfirmed', label: 'Payment updates', icon: '💳' },
                    { key: 'marketing', label: 'Marketing & promotions', icon: '📣' },
                  ] as const
                ).map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{icon}</span>
                      <p className="text-sm">{label}</p>
                    </div>
                    <Toggle
                      value={prefs[key]}
                      onChange={(v) => void updatePrefs.mutateAsync({ [key]: v })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-6 rounded-full transition-colors ${
        value ? 'bg-indigo-600' : 'bg-slate-600'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
