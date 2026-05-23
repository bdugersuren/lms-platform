export interface AuditActionPayload {
  actor: {
    userId: string;
    email: string;
    role: string;
  };
  action: {
    method: string;
    path: string;
    service: string;
  };
  outcome: {
    statusCode: number;
    success: boolean;
  };
  context: {
    ip: string;
    userAgent: string;
    correlationId: string;
  };
  occurredAt: string;
}
