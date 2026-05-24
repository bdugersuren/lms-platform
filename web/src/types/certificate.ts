export type CertificateStatus = 'PENDING' | 'ISSUED' | 'REVOKED';

export interface Certificate {
  id: string;
  userId: string;
  courseId?: string;
  title: string;
  recipientName: string;
  issuerName: string;
  description?: string;
  completedAt: string;
  issuedAt: string;
  expiresAt?: string;
  status: CertificateStatus;
  verifyCode: string;
  qrCodeUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateList {
  items: Certificate[];
  total: number;
  limit: number;
  offset: number;
}

export interface VerifyResult {
  valid: boolean;
  pending: boolean;
  certificate: Certificate;
}

export interface CreateCertificateDto {
  userId: string;
  title: string;
  recipientName: string;
  courseId?: string;
  description?: string;
  issuerName?: string;
  completedAt: string;
  expiresAt?: string;
}
