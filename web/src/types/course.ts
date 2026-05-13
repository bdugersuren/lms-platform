export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type LessonType = 'VIDEO' | 'PDF' | 'MARKDOWN' | 'TEXT' | 'LIVE' | 'QUIZ';
export type InteractiveBlockType = 'QUIZ' | 'CHECKPOINT' | 'INFO' | 'ASSIGNMENT' | 'AI_PROMPT';
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ORDERING' | 'MATCHING' | 'SHORT_TEXT';
export type ProgressStatus = 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED';

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  instructorId: string;
  price: string;
  level: CourseLevel;
  status: CourseStatus;
  tags: string[];
  language: string;
  totalLessons: number;
  totalMinutes: number;
  passingScore: number;
  isSequential: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InteractiveQuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface InteractiveQuestion {
  id: string;
  interactiveBlockId: string;
  questionType: QuestionType;
  questionText: string;
  explanation: string | null;
  score: number;
  sortOrder: number;
  options: InteractiveQuestionOption[];
}

export interface InteractiveBlock {
  id: string;
  lessonId: string;
  title: string | null;
  blockType: InteractiveBlockType;
  sortOrder: number;
  triggerSecond: number | null;
  triggerPage: number | null;
  triggerParagraph: number | null;
  contentJson: Record<string, unknown>;
  isRequired: boolean;
  passingScore: number | null;
  unlockNextContent: boolean;
  continueOnPassOnly: boolean;
  questions: InteractiveQuestion[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  lessonType: LessonType;
  sortOrder: number;
  contentUrl: string | null;
  rawMarkdown: string | null;
  rawText: string | null;
  estimatedMinutes: number | null;
  isPreview: boolean;
  passingScore: number;
  unlockNextOnPass: boolean;
  createdAt: string;
  updatedAt: string;
  interactiveBlocks?: InteractiveBlock[];
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  unlockScore: number | null;
  createdAt: string;
  lessons: Lesson[];
}

export interface CourseDetail extends Course {
  modules: CourseModule[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CourseListResponse {
  success: boolean;
  data: { items: Course[]; meta: PaginationMeta };
  message: string;
}

export interface CourseDetailResponse {
  success: boolean;
  data: CourseDetail;
  message: string;
}

export interface CreateCourseDto {
  title: string;
  description?: string;
  thumbnail?: string;
  level?: CourseLevel;
  price?: string;
  tags?: string[];
  language?: string;
  isSequential?: boolean;
  passingScore?: number;
}
