import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import axios from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { MediaFile, MediaList, MediaType, UpdateMediaDto, TranscodeFormat, TranscodeJob, Subtitle } from '@/types/media';

interface ApiSuccess<T> { success: boolean; data: T; message?: string; }

// ─── Media Library ────────────────────────────────────────────────────────────

export function useMediaLibrary(params?: { mediaType?: MediaType; search?: string; limit?: number; offset?: number }) {
  return useQuery<MediaList>({
    queryKey: ['media-files', params],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params?.mediaType) q.set('mediaType', params.mediaType);
      if (params?.search) q.set('search', params.search);
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      const { data } = await api.get<ApiSuccess<MediaList>>(`/media/files${q.toString() ? `?${q}` : ''}`);
      return data.data;
    },
  });
}

export function useMediaFile(id: string) {
  return useQuery<MediaFile>({
    queryKey: ['media-file', id],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<MediaFile>>(`/media/files/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useUpdateMedia() {
  const qc = useQueryClient();
  return useMutation<MediaFile, Error, { id: string; dto: UpdateMediaDto }>({
    mutationFn: async ({ id, dto }) => {
      const { data } = await api.patch<ApiSuccess<MediaFile>>(`/media/files/${id}`, dto);
      return data.data;
    },
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ['media-file', id] });
      void qc.invalidateQueries({ queryKey: ['media-files'] });
    },
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => { await api.delete(`/media/files/${id}`); },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['media-files'] }); },
  });
}

// ─── Upload (to media-service, includes DB metadata) ──────────────────────────

export interface MediaUploadState { progress: number; uploading: boolean; error: string | null; }

export function useMediaUpload() {
  const [state, setState] = useState<MediaUploadState>({ progress: 0, uploading: false, error: null });
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();

  const upload = useCallback((file: File): Promise<MediaFile> => {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);
      setState({ progress: 0, uploading: true, error: null });

      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
      axios.post<ApiSuccess<MediaFile>>(`${apiBase}/media/files`, form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        onUploadProgress: (e) => {
          if (e.total) setState(s => ({ ...s, progress: Math.round((e.loaded / e.total!) * 100) }));
        },
      })
        .then((res) => {
          setState({ progress: 100, uploading: false, error: null });
          void qc.invalidateQueries({ queryKey: ['media-files'] });
          resolve(res.data.data);
        })
        .catch((err: { response?: { data?: { message?: string } }; message?: string }) => {
          const msg = err.response?.data?.message ?? err.message ?? 'Upload failed';
          setState({ progress: 0, uploading: false, error: msg });
          reject(new Error(msg));
        });
    });
  }, [accessToken, qc]);

  const reset = useCallback(() => setState({ progress: 0, uploading: false, error: null }), []);
  return { upload, reset, ...state };
}

// ─── Transcode ────────────────────────────────────────────────────────────────

export function useQueueTranscode() {
  const qc = useQueryClient();
  return useMutation<TranscodeJob, Error, { mediaFileId: string; format: TranscodeFormat }>({
    mutationFn: async ({ mediaFileId, format }) => {
      const { data } = await api.post<ApiSuccess<TranscodeJob>>(`/media/files/${mediaFileId}/transcode`, { format });
      return data.data;
    },
    onSuccess: (_, { mediaFileId }) => {
      void qc.invalidateQueries({ queryKey: ['media-file', mediaFileId] });
    },
  });
}

export function useTranscodeJobs(mediaFileId: string) {
  return useQuery<TranscodeJob[]>({
    queryKey: ['transcode-jobs', mediaFileId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<TranscodeJob[]>>(`/media/files/${mediaFileId}/transcode`);
      return data.data;
    },
    enabled: !!mediaFileId,
    refetchInterval: 10000,
  });
}

// ─── Subtitles ────────────────────────────────────────────────────────────────

export function useSubtitles(mediaFileId: string) {
  return useQuery<Subtitle[]>({
    queryKey: ['subtitles', mediaFileId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Subtitle[]>>(`/media/files/${mediaFileId}/subtitles`);
      return data.data;
    },
    enabled: !!mediaFileId,
  });
}

export function useDeleteSubtitle() {
  const qc = useQueryClient();
  return useMutation<void, Error, { mediaFileId: string; subtitleId: string }>({
    mutationFn: async ({ subtitleId }) => { await api.delete(`/media/subtitles/${subtitleId}`); },
    onSuccess: (_, { mediaFileId }) => {
      void qc.invalidateQueries({ queryKey: ['subtitles', mediaFileId] });
    },
  });
}
