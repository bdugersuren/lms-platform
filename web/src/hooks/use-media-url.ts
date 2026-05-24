'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

function isExternalEmbed(url: string): boolean {
  return (
    /youtube\.com|youtu\.be/i.test(url) ||
    /vimeo\.com/i.test(url)
  );
}

interface MediaUrlState {
  mediaUrl: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useMediaUrl(rawUrl: string | null | undefined): MediaUrlState {
  const [fetchKey, setFetchKey] = useState(0);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!rawUrl) {
      setMediaUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    // External embeds (YouTube, Vimeo) — no presigning needed
    if (isExternalEmbed(rawUrl)) {
      setMediaUrl(rawUrl);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout>;

    setMediaUrl(null);
    setLoading(true);
    setError(null);

    api
      .get<{ data: { presignedUrl: string; expiresAt: string } }>('/media/presign', {
        params: { src: rawUrl },
      })
      .then((res) => {
        if (cancelled) return;
        const { presignedUrl, expiresAt } = res.data.data;
        setMediaUrl(presignedUrl);
        setLoading(false);
        setError(null);

        // Proactively refresh 5 minutes before expiry to avoid mid-playback interruption
        const msUntilExpiry = new Date(expiresAt).getTime() - Date.now();
        const refreshIn = Math.max(msUntilExpiry - 5 * 60 * 1000, 30_000);
        refreshTimer = setTimeout(() => setFetchKey((k) => k + 1), refreshIn);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setMediaUrl(null);
        setLoading(false);
        setError(err.message);
      });

    return () => {
      cancelled = true;
      clearTimeout(refreshTimer);
    };
  }, [rawUrl, fetchKey]);

  return { mediaUrl, loading, error, refresh };
}
