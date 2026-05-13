export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT',
}

export interface IUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
