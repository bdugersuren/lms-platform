export interface UserServiceProfile {
  id: string;
  tenantId?: string | null;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  headline?: string | null;
  expertise?: string[];
  learningGoals?: string[];
  locale: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProfile {
  id: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  headline?: string | null;
  expertise?: string[];
}

export interface UpdateProfileDto {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  bio?: string;
  headline?: string;
  expertise?: string[];
  learningGoals?: string[];
  locale?: string;
  timezone?: string;
}
