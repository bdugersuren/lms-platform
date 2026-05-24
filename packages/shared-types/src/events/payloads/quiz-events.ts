export interface QuizAttemptSubmittedPayload {
  attemptId: string;
  tenantId?: string;
  quizId: string;
  studentId: string;
  courseId?: string;
  score: number;
  maxScore?: number;
  passed: boolean;
}
