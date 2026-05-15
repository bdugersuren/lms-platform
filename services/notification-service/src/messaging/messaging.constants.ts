export const NOTIFICATION_RABBITMQ_CLIENT = 'NOTIFICATION_RABBITMQ_CLIENT';

// Routing keys this service listens to
export const ROUTING_KEYS = {
  AUTH_REGISTERED: 'auth.user.registered',
  ASSIGNMENT_GRADED: 'assignment.submission.graded',
  QUIZ_COMPLETED: 'quiz.attempt.completed',
  COURSE_ENROLLED: 'enrollment.created',
  PAYMENT_CONFIRMED: 'payment.confirmed',
  PAYMENT_FAILED: 'payment.failed',
} as const;
