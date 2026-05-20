import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAdminUsers } from '@/hooks/use-auth';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { data: { items: [], total: 0, page: 1, limit: 20 } } }),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useAdminUsers — RBAC query gating', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('does NOT fire the query when enabled is false', async () => {
    const { api } = await import('@/lib/api');
    const { result } = renderHook(
      () => useAdminUsers({ enabled: false }),
      { wrapper: makeWrapper() },
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('fires the query when enabled is true', async () => {
    const { api } = await import('@/lib/api');
    renderHook(
      () => useAdminUsers({ enabled: true }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/auth/users', expect.any(Object));
    });
  });

  it('strips enabled from the query params sent to the API', async () => {
    const { api } = await import('@/lib/api');
    renderHook(
      () => useAdminUsers({ page: 2, limit: 10, enabled: true }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      const callArgs = (api.get as ReturnType<typeof vi.fn>).mock.calls[0];
      const params = callArgs[1].params;
      expect(params).not.toHaveProperty('enabled');
      expect(params).toMatchObject({ page: 2, limit: 10 });
    });
  });
});
