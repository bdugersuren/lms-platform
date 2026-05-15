export interface AnalyticsOverview {
  totalUsers: number;
  totalEnrollments: number;
  completedCourses: number;
  confirmedPayments: number;
  failedPayments: number;
  quizAttempts: number;
  assignmentSubmissions: number;
  certificatesIssued: number;
  mediaUploads: number;
  totalRevenue: number;
  avgQuizScore: number | null;
  completionRate: number;
}

export interface TimeSeriesPoint {
  date: string;
  newUsers: number;
  newEnrollments: number;
  completedCourses: number;
  revenue: number;
  quizAttempts: number;
  certificates: number;
}

export interface AnalyticsEvent {
  id: string;
  eventType: string;
  userId?: string;
  courseId?: string;
  occurredAt: string;
}

export interface EventsPage {
  items: AnalyticsEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface CourseStat {
  courseId: string;
  enrollments: number;
}

export interface UserActivityPoint {
  date: string;
  activeUsers: number;
}

export interface EventBreakdownItem {
  eventType: string;
  count: number;
}
