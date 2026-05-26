export interface CodingSubmissionQueuedPayload {
  codingSubmissionId: string;
  assignmentId: string;
  studentId: string;
  tenantId: string;
  language: string;
  queuedAt: string;
}

export interface CodingSubmissionJudgingPayload {
  codingSubmissionId: string;
  assignmentId: string;
  studentId: string;
  tenantId: string;
  dmojSubmissionId: number;
  judgedAt: string;
}

export interface CodingSubmissionGradedPayload {
  codingSubmissionId: string;
  lmsSubmissionId: string;
  assignmentId: string;
  studentId: string;
  tenantId: string;
  dmojSubmissionId: number;
  score: number;
  maxScore: number;
  passed: boolean;
  timeMs: number | null;
  memoryKb: number | null;
  gradedAt: string;
}

export interface CodingSubmissionFailedPayload {
  codingSubmissionId: string;
  assignmentId: string;
  studentId: string;
  tenantId: string;
  reason: string;
  failedAt: string;
}
