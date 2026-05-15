export type NotificationType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'ASSIGNMENT_GRADED'
  | 'COURSE_ENROLLED'
  | 'QUIZ_RESULT'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'SYSTEM';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationList {
  items: Notification[];
  total: number;
  unreadCount: number;
  limit: number;
  offset: number;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
  assignmentGraded: boolean;
  courseEnrolled: boolean;
  quizResult: boolean;
  paymentConfirmed: boolean;
  marketing: boolean;
}

export interface UpdatePreferencesDto {
  inApp?: boolean;
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  assignmentGraded?: boolean;
  courseEnrolled?: boolean;
  quizResult?: boolean;
  paymentConfirmed?: boolean;
  marketing?: boolean;
}
