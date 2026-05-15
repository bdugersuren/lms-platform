export type MediaType = 'VIDEO' | 'AUDIO' | 'IMAGE' | 'PDF' | 'DOCUMENT' | 'OTHER';
export type MediaStatus = 'UPLOADING' | 'READY' | 'TRANSCODING' | 'FAILED' | 'DELETED';
export type TranscodeStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
export type TranscodeFormat = 'MP4_720P' | 'MP4_1080P' | 'MP4_480P' | 'HLS' | 'WEBM';

export interface MediaFile {
  id: string;
  userId: string;
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  mediaType: MediaType;
  size: number;
  status: MediaStatus;
  title?: string;
  description?: string;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { subtitles: number; transcodeJobs: number };
  subtitles?: Subtitle[];
  transcodeJobs?: TranscodeJob[];
}

export interface MediaList {
  items: MediaFile[];
  total: number;
  limit: number;
  offset: number;
}

export interface UpdateMediaDto {
  title?: string;
  description?: string;
  duration?: number;
  thumbnail?: string;
}

export interface TranscodeJob {
  id: string;
  mediaFileId: string;
  format: TranscodeFormat;
  status: TranscodeStatus;
  outputKey?: string;
  outputUrl?: string;
  errorMsg?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Subtitle {
  id: string;
  mediaFileId: string;
  language: string;
  label: string;
  url: string;
  format: string;
  createdAt: string;
}

export interface PresignResult {
  presignedUrl: string;
  expiresAt: string;
}
