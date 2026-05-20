export interface EnrollmentCreatedPayload {
  enrollmentId: string;
  courseId: string;
  studentId: string;
}

export interface EnrollmentCompletedPayload {
  enrollmentId: string;
  courseId: string;
  userId: string;
  studentId: string;
  courseTitle?: string;
  completedAt: string;
  recipientName?: string;
}

export interface LessonCompletedPayload {
  enrollmentId: string;
  courseId: string;
  lessonId: string;
  studentId: string;
}
