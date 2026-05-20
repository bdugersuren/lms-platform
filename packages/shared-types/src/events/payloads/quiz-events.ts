export interface QuizAttemptSubmittedPayload {
  attemptId: string;
  quizId: string;
  studentId: string;
  score: number;
  maxScore: number;
  passed: boolean;
}
