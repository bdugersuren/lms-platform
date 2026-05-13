import { UserRole } from '../user/user.interface';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
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
