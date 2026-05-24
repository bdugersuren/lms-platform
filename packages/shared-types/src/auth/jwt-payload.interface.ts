import { UserRole } from '../user/user.interface';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  activeTenantId?: string;
  tenantMemberships?: Array<{
    tenantId: string;
    role: string;
  }>;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}
