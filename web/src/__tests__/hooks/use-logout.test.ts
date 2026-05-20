import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn(),
  },
}));

const mockLogout = vi.fn();

const mockAuthState = {
  isAuthenticated: true,
  logout: mockLogout,
  setTokens: vi.fn(),
  accessToken: 'fake-token',
  refreshToken: 'fake-refresh',
  user: null,
  setUser: vi.fn(),
};

// Zustand's useAuthStore is called either with a selector or without one.
// Without a selector it returns the whole state object.
vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn((selector?: (s: typeof mockAuthState) => unknown) =>
    selector ? selector(mockAuthState) : mockAuthState,
  ),
}));

describe('useLogout — cache invalidation', () => {
  let qc: QueryClient;

  function makeWrapper() {
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('clears user-profile cache on logout', async () => {
    qc.setQueryData(['user-profile', 'me'], {
      id: '1',
      displayName: 'User A',
      locale: 'mn',
      timezone: 'Asia/Ulaanbaatar',
      createdAt: '',
      updatedAt: '',
    });

    expect(qc.getQueryData(['user-profile', 'me'])).toBeDefined();

    const { useLogout } = await import('@/hooks/use-auth');
    const { result } = renderHook(() => useLogout(), { wrapper: makeWrapper() });

    await act(async () => {
      result.current.mutate();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(qc.getQueryData(['user-profile', 'me'])).toBeUndefined();
  });

  it('clears me cache on logout', async () => {
    qc.setQueryData(['me'], { id: '1', email: 'a@test.com', role: 'STUDENT' });
    expect(qc.getQueryData(['me'])).toBeDefined();

    const { useLogout } = await import('@/hooks/use-auth');
    const { result } = renderHook(() => useLogout(), { wrapper: makeWrapper() });

    await act(async () => {
      result.current.mutate();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(qc.getQueryData(['me'])).toBeUndefined();
  });
});
