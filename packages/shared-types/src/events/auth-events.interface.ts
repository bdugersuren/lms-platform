import { UserRole } from '../user/user.interface';

export const AuthEventPatterns = {
  USER_REGISTERED: 'auth.user.registered',
  USER_LOGGED_IN: 'auth.user.logged_in',
  USER_LOGGED_OUT: 'auth.user.logged_out',
  PASSWORD_CHANGED: 'auth.user.password_changed',
  TOKEN_REFRESHED: 'auth.user.token_refreshed',
} as const;

export type AuthEventPattern = (typeof AuthEventPatterns)[keyof typeof AuthEventPatterns];

export interface UserRegisteredEvent {
  userId: string;
  tenantId?: string;
  email: string;
  role: UserRole;
  timestamp: string;
}

export interface UserLoggedInEvent {
  userId: string;
  tenantId?: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface UserLoggedOutEvent {
  userId: string;
  timestamp: string;
}

export interface PasswordChangedEvent {
  userId: string;
  timestamp: string;
}

export interface TokenRefreshedEvent {
  userId: string;
  timestamp: string;
}
