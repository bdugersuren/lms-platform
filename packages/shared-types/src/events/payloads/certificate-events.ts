export interface CertificateIssuedPayload {
  certificateId: string;
  tenantId?: string;
  userId: string;
  courseId?: string;
  verifyCode: string;
}

export interface CertificateRevokedPayload {
  certificateId: string;
  tenantId?: string;
  userId: string;
}
