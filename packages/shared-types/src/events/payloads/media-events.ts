export interface MediaFileUploadedPayload {
  mediaFileId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface MediaFileDeletedPayload {
  mediaFileId: string;
  userId: string;
}

export interface MediaTranscodeQueuedPayload {
  mediaFileId: string;
  userId: string;
  sourceUrl: string;
  targetFormat: string;
}
