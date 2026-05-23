export interface QuizAttemptSubmittedPayload {
  attemptId: string;
  quizId: string;
  studentId: string;
  courseId?: string;
  score: number;
  maxScore?: number;
  passed: boolean;
}
