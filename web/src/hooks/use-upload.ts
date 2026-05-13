'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

export interface UploadResult {
  url: string;
  key: string;
  mimeType: string;
  size: number;
}

export interface UploadState {
  progress: number;    // 0–100
  uploading: boolean;
  error: string | null;
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({ progress: 0, uploading: false, error: null });
  const { accessToken } = useAuthStore();

  const upload = useCallback(
    (file: File): Promise<UploadResult> => {
      return new Promise((resolve, reject) => {
        const form = new FormData();
        form.append('file', file);

        setState({ progress: 0, uploading: true, error: null });

        axios.post<{ success: boolean; data: UploadResult }>('/api/media/upload', form, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          onUploadProgress: (e) => {
            if (e.total) {
              setState(s => ({ ...s, progress: Math.round((e.loaded / e.total!) * 100) }));
            }
          },
        })
          .then((res) => {
            setState({ progress: 100, uploading: false, error: null });
            resolve(res.data.data);
          })
          .catch((err) => {
            const msg = err.response?.data?.message ?? err.message ?? 'Upload failed';
            setState({ progress: 0, uploading: false, error: msg });
            reject(new Error(msg));
          });
      });
    },
    [accessToken],
  );

  const reset = useCallback(() => setState({ progress: 0, uploading: false, error: null }), []);

  return { upload, reset, ...state };
}
