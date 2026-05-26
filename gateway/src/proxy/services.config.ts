export const SERVICE_ROUTES: Record<string, string | undefined> = {
  auth: process.env.AUTH_SERVICE_URL,
  tenants: process.env.TENANT_SERVICE_URL,
  users: process.env.USER_SERVICE_URL,
  courses: process.env.COURSE_SERVICE_URL,
  enrollments: process.env.ENROLLMENT_SERVICE_URL,
  quizzes: process.env.QUIZ_SERVICE_URL,
  assignments: process.env.ASSIGNMENT_SERVICE_URL,
  wallet: process.env.WALLET_SERVICE_URL,
  payments: process.env.PAYMENT_SERVICE_URL,
  webhooks: process.env.PAYMENT_SERVICE_URL,
  ai: process.env.AI_SERVICE_URL,
  notifications: process.env.NOTIFICATION_SERVICE_URL,
  media: process.env.MEDIA_SERVICE_URL,
  certificates: process.env.CERTIFICATE_SERVICE_URL,
  analytics: process.env.ANALYTICS_SERVICE_URL,
  audit: process.env.AUDIT_SERVICE_URL,
  coding: process.env.CODING_SERVICE_URL,
} as const;

export type ServiceKey = keyof typeof SERVICE_ROUTES;
