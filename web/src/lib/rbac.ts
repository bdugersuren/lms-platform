import type { UserProfile } from '@/types/auth';

export type UserRole = UserProfile['role'];

export const isAdmin = (role: UserRole): boolean =>
  role === 'ADMIN' || role === 'SUPER_ADMIN';

export const isInstructor = (role: UserRole): boolean =>
  role === 'INSTRUCTOR';

export const canManageCourses = (role: UserRole): boolean =>
  isAdmin(role) || isInstructor(role);
