export interface AssignmentSubmissionGradedPayload {
  submissionId: string;
  tenantId?: string;
  assignmentId: string;
  studentId: string;
  courseId?: string;
  score: number;
  maxScore: number;
  passed: boolean;
}

export interface AssignmentSubmissionSubmittedPayload {
  assignmentId: string;
  submissionId: string;
  studentId: string;
  isLate: boolean;
}
