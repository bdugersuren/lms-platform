export const CourseEventPatterns = {
  CREATED: 'course.course.created',
  PUBLISHED: 'course.course.published',
  ARCHIVED: 'course.course.archived',
  UPDATED: 'course.course.updated',
} as const;

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
