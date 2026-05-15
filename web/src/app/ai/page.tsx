'use client';

import { useState, useRef, useEffect } from 'react';
import {
  useChatSessions,
  useCreateSession,
  useDeleteSession,
  useChatSession,
  useSendMessage,
} from '@/hooks/use-ai';
import type { ChatSession } from '@/types/ai';

export default function AiTutorPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [], isLoading: sessionsLoading } = useChatSessions();
  const { data: activeSession } = useChatSession(activeSessionId ?? '');
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();
  const sendMessage = useSendMessage(activeSessionId ?? '');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  async function handleNewChat() {
    const session = await createSession.mutateAsync({ title: 'New Chat' });
    setActiveSessionId(session.id);
  }

  async function handleSend() {
    if (!input.trim() || !activeSessionId) return;
    const text = input.trim();
    setInput('');
    await sendMessage.mutateAsync({ content: text });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const messages = activeSession?.messages ?? [];

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-lg font-bold text-indigo-400">AI Tutor</h1>
          <p className="text-xs text-slate-400 mt-1">Powered by Ollama</p>
        </div>

        <div className="p-3">
          <button
            onClick={() => void handleNewChat()}
            disabled={createSession.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
          >
            {createSession.isPending ? 'Creating...' : '+ New Chat'}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessionsLoading && (
            <p className="text-slate-500 text-xs text-center py-4">Loading...</p>
          )}
          {sessions.map((s: ChatSession) => (
            <div
              key={s.id}
              className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                s.id === activeSessionId
                  ? 'bg-indigo-600/20 border border-indigo-500/40'
                  : 'hover:bg-slate-700'
              }`}
              onClick={() => setActiveSessionId(s.id)}
            >
              <span className="flex-1 text-sm truncate">{s.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteSession.mutateAsync(s.id).then(() => {
                    if (activeSessionId === s.id) setActiveSessionId(null);
                  });
                }}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 text-xs transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
          {!sessionsLoading && sessions.length === 0 && (
            <p className="text-slate-500 text-xs text-center py-8">
              No chats yet. Start a new one!
            </p>
          )}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <a
            href="/ai/essay-score"
            className="block text-center text-sm text-slate-400 hover:text-indigo-400 py-2 transition-colors"
          >
            Essay Scorer
          </a>
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!activeSessionId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-6xl">🤖</div>
              <h2 className="text-2xl font-bold text-white">AI Tutor</h2>
              <p className="text-slate-400">
                Get personalized help with your studies. Ask questions, explore concepts,
                and deepen your understanding.
              </p>
              <button
                onClick={() => void handleNewChat()}
                disabled={createSession.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 px-8 rounded-xl transition-colors"
              >
                Start Chatting
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 mt-16">
                  <p className="text-4xl mb-3">💬</p>
                  <p>Ask me anything about your course material!</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <span className="block text-xs text-indigo-400 font-medium mb-1">AI Tutor</span>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              {sendMessage.isPending && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
                    <span className="text-xs text-indigo-400 font-medium block mb-1">AI Tutor</span>
                    <span className="flex gap-1">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-700 p-4">
              {sendMessage.isError && (
                <p className="text-red-400 text-xs mb-2 text-center">
                  {sendMessage.error?.message ?? 'Failed to send message'}
                </p>
              )}
              <div className="flex gap-3 items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your AI tutor anything... (Enter to send, Shift+Enter for newline)"
                  rows={2}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={sendMessage.isPending || !input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-5 py-3 rounded-xl font-medium text-sm transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
