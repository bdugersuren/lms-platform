export const ANALYTICS_RABBITMQ_CLIENT = 'ANALYTICS_RABBITMQ_CLIENT';

// All event types the analytics service ingests
export const TRACKED_EVENTS = {
  USER_REGISTERED:           'auth.user.registered',
  ENROLLMENT_CREATED:        'enrollment.created',
  ENROLLMENT_COMPLETED:      'enrollment.completed',
  PAYMENT_CONFIRMED:         'payment.confirmed',
  PAYMENT_FAILED:            'payment.failed',
  QUIZ_COMPLETED:            'quiz.attempt.completed',
  ASSIGNMENT_GRADED:         'assignment.submission.graded',
  MEDIA_UPLOADED:            'media.file.uploaded',
  CERTIFICATE_ISSUED:        'certificate.issued',
} as const;
