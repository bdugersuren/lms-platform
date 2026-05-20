export interface CertificateIssuedPayload {
  certificateId: string;
  userId: string;
  courseId?: string;
  verifyCode: string;
}

export interface CertificateRevokedPayload {
  certificateId: string;
  userId: string;
}
