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
  jobId: string;
  mediaFileId: string;
  sourceKey: string;
  format: string;
}

export interface MediaTranscodeCompletedPayload {
  jobId: string;
  mediaFileId: string;
  format: string;
  outputKey: string;
}

export interface MediaTranscodeFailedPayload {
  jobId: string;
  mediaFileId: string;
  format: string;
  errorMsg: string;
}
