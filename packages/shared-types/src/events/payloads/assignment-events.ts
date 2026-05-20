export interface AssignmentSubmissionGradedPayload {
  submissionId: string;
  assignmentId: string;
  studentId: string;
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
