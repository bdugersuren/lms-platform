export interface EnrollmentCreatedPayload {
  enrollmentId: string;
  tenantId?: string;
  courseId: string;
  studentId: string;
}

export interface EnrollmentCompletedPayload {
  enrollmentId: string;
  tenantId?: string;
  courseId: string;
  userId: string;
  studentId: string;
  courseTitle?: string;
  completedAt: string;
  recipientName?: string;
}

export interface LessonCompletedPayload {
  enrollmentId: string;
  tenantId?: string;
  courseId: string;
  lessonId: string;
  studentId: string;
}
