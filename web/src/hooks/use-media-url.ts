'use client';

import { useState, useEffect } from 'react';
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
}

export function useMediaUrl(rawUrl: string | null | undefined): MediaUrlState {
  const [state, setState] = useState<MediaUrlState>({
    mediaUrl: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!rawUrl) {
      setState({ mediaUrl: null, loading: false, error: null });
      return;
    }

    // External embeds (YouTube, Vimeo) — no presigning needed
    if (isExternalEmbed(rawUrl)) {
      setState({ mediaUrl: rawUrl, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ mediaUrl: null, loading: true, error: null });

    api
      .get<{ data: { presignedUrl: string; expiresAt: string } }>('/media/presign', {
        params: { src: rawUrl },
      })
      .then((res) => {
        if (!cancelled) {
          setState({ mediaUrl: res.data.data.presignedUrl, loading: false, error: null });
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setState({ mediaUrl: null, loading: false, error: err.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rawUrl]);

  return state;
}
