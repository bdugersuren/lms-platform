export const EventTypes = {
  // Enrollment
  ENROLLMENT_CREATED:              'enrollment.created',
  ENROLLMENT_COMPLETED:            'enrollment.completed',
  LESSON_COMPLETED:                'lesson.completed',
  // Payment
  PAYMENT_CONFIRMED:               'payment.confirmed',
  PAYMENT_FAILED:                  'payment.failed',
  // Certificate
  CERTIFICATE_ISSUED:              'certificate.issued',
  CERTIFICATE_REVOKED:             'certificate.revoked',
  // Quiz — canonical name is 'quiz.attempt.submitted' (quiz-service producer)
  QUIZ_ATTEMPT_SUBMITTED:          'quiz.attempt.submitted',
  // Assignment
  ASSIGNMENT_SUBMISSION_GRADED:    'assignment.submission.graded',
  ASSIGNMENT_SUBMISSION_SUBMITTED: 'assignment.submission.submitted',
  // Wallet
  WALLET_REVENUE_DISTRIBUTED:      'wallet.revenue.distributed',
  WALLET_PAYOUT_REQUESTED:         'wallet.payout.requested',
  // Course
  COURSE_STUDENT_ENROLLED:         'course.student.enrolled',
  // Media
  MEDIA_FILE_UPLOADED:             'media.file.uploaded',
  MEDIA_FILE_DELETED:              'media.file.deleted',
  MEDIA_TRANSCODE_QUEUED:          'media.transcode.queued',
  MEDIA_TRANSCODE_COMPLETED:       'media.transcode.completed',
  MEDIA_TRANSCODE_FAILED:          'media.transcode.failed',
  // Audit
  AUDIT_ACTION_PERFORMED:          'audit.action.performed',
  // Coding (DMOJ judge)
  CODING_SUBMISSION_QUEUED:        'coding.submission.queued',
  CODING_SUBMISSION_JUDGING:       'coding.submission.judging',
  CODING_SUBMISSION_GRADED:        'coding.submission.graded',
  CODING_SUBMISSION_FAILED:        'coding.submission.failed',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
