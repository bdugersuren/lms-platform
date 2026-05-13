export type AssignmentType = 'FILE_UPLOAD' | 'TEXT' | 'LINK' | 'CODE';
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'GRADED' | 'RETURNED';
export type GradeStatus = 'PENDING' | 'GRADED' | 'APPEALED';

export interface Assignment {
  id: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  type: AssignmentType;
  maxScore: number;
  passingScore: number;
  dueDate: string | null;
  isPublished: boolean;
  allowLate: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { submissions: number };
}

export interface Grade {
  id: string;
  submissionId: string;
  gradedBy: string;
  score: number;
  maxScore: number;
  feedback: string | null;
  status: GradeStatus;
  gradedAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  status: SubmissionStatus;
  content: string | null;
  fileUrls: string[];
  linkUrl: string | null;
  submittedAt: string | null;
  isLate: boolean;
  createdAt: string;
  updatedAt: string;
  grade: Grade | null;
}

export interface CreateAssignmentDto {
  courseId: string;
  lessonId?: string;
  title: string;
  description?: string;
  type?: AssignmentType;
  maxScore?: number;
  passingScore?: number;
  dueDate?: string;
  allowLate?: boolean;
}

export interface CreateSubmissionDto {
  content?: string;
  fileUrls?: string[];
  linkUrl?: string;
}

export interface CreateGradeDto {
  score: number;
  feedback?: string;
}
