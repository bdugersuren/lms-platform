export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_TEXT';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'EXPIRED';

export interface QuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface Question {
  id: string;
  quizId: string;
  questionType: QuestionType;
  questionText: string;
  explanation: string | null;
  score: number;
  sortOrder: number;
  options: QuestionOption[];
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  passingScore: number;
  timeLimit: number | null;
  maxAttempts: number;
  isAdaptive: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
  _count?: { attempts: number; questions?: number };
}

export interface AttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionIds: string[];
  textAnswer: string | null;
  isCorrect: boolean;
  score: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  status: AttemptStatus;
  score: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string | null;
  expiresAt: string | null;
  answers?: AttemptAnswer[];
  _count?: { answers: number };
}

export interface CreateQuizDto {
  courseId: string;
  lessonId?: string;
  title: string;
  description?: string;
  passingScore?: number;
  timeLimit?: number;
  maxAttempts?: number;
  isAdaptive?: boolean;
}

export interface AnswerDto {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
}

export interface SubmitAttemptDto {
  answers: AnswerDto[];
}
