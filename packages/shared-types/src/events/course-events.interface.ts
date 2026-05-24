export const CourseEventPatterns = {
  CREATED: 'course.course.created',
  PUBLISHED: 'course.course.published',
  ARCHIVED: 'course.course.archived',
  UPDATED: 'course.course.updated',
} as const;

export const CourseContentEventPatterns = {
  PUBLISHED: 'course.published',
  UPDATED: 'course.updated',
  LESSON_CREATED: 'course.lesson.created',
  LESSON_UPDATED: 'course.lesson.updated',
  LESSON_DELETED: 'course.lesson.deleted',
  LESSON_REORDERED: 'course.lesson.reordered',
} as const;

export type CourseContentEventPattern =
  (typeof CourseContentEventPatterns)[keyof typeof CourseContentEventPatterns];

export interface EventEnvelope<TPayload> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  producer: string;
  aggregateType: string;
  aggregateId: string;
  sequence: number;
  correlationId?: string;
  causationId?: string;
  payload: TPayload;
}

export interface CourseProjectionPayload {
  courseId: string;
  tenantId: string;
  title: string;
  slug: string;
  instructorId: string;
  price: string;
  status: string;
  isSequential: boolean;
  totalLessons: number;
  totalMinutes: number;
  contentVersion: number;
  publishedAt?: string | null;
  requireQuizPass: boolean;
  requireAssignmentPass: boolean;
  minimumScorePercent: number;
}

export interface ModuleProjectionPayload {
  moduleId: string;
  courseId: string;
  title: string;
  sortOrder: number;
  contentVersion: number;
}

export interface LessonProjectionPayload {
  lessonId: string;
  courseId: string;
  moduleId: string;
  title: string;
  lessonType: string;
  sortOrder: number;
  passingScore: number;
  unlockNextOnPass: boolean;
  contentVersion: number;
  deletedAt?: string | null;
}

export interface CourseSnapshotPayload {
  contentVersion: number;
  course: CourseProjectionPayload;
  modules: ModuleProjectionPayload[];
  lessons: LessonProjectionPayload[];
}

export interface CoursePublishedPayload extends CourseSnapshotPayload {
  publishedAt: string;
}

export interface CourseUpdatedPayload extends CourseSnapshotPayload {
  changedFields: string[];
}

export interface CourseLessonPayload {
  contentVersion: number;
  course: CourseProjectionPayload;
  module: ModuleProjectionPayload;
  lesson: LessonProjectionPayload;
}

export interface CourseLessonDeletedPayload extends CourseLessonPayload {
  deletedAt: string;
}

export interface CourseLessonReorderedPayload extends CourseSnapshotPayload {
  order: Array<{
    moduleId: string;
    lessonId: string;
    sortOrder: number;
  }>;
}

export type CourseContentEventPayload =
  | CoursePublishedPayload
  | CourseUpdatedPayload
  | CourseLessonPayload
  | CourseLessonDeletedPayload
  | CourseLessonReorderedPayload;

export type CourseContentEventEnvelope =
  EventEnvelope<CourseContentEventPayload>;

export interface CourseCreatedEvent {
  courseId: string;
  title: string;
  slug: string;
  instructorId: string;
  timestamp: string;
}

export interface CoursePublishedEvent {
  courseId: string;
  title: string;
  instructorId: string;
  timestamp: string;
}

export interface CourseArchivedEvent {
  courseId: string;
  instructorId: string;
  timestamp: string;
}
