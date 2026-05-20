import type { UserServiceProfile } from '@/types/user';
import type { UserRole } from '@/lib/rbac';

export interface ProfileStep {
  key: string;
  label: string;
  labelMn: string;
  done: boolean;
  href: string;
  weight: number;
}

export interface CompletionResult {
  score: number;
  steps: ProfileStep[];
  isComplete: boolean;
  isCertificateReady: boolean;
  certificateBlocker: string | null;
}

export function getEmailPrefix(email: string): string {
  return email.split('@')[0];
}

export function isCertificateReady(
  profile: Pick<UserServiceProfile, 'displayName' | 'firstName' | 'lastName'>,
  email: string,
): { ready: boolean; blocker: string | null } {
  const emailPrefix = getEmailPrefix(email);
  if (profile.displayName === emailPrefix) {
    return { ready: false, blocker: 'Бодит нэрээ оруулна уу. И-мэйл хаягийн угтвар гэрчилгээнд хэрэглэгдэхгүй.' };
  }
  if (profile.displayName.trim().length < 3) {
    return { ready: false, blocker: 'Харагдах нэр хэтэрхий богино байна.' };
  }
  const hasFullName = !!(profile.firstName && profile.lastName);
  const hasSpaceInName = profile.displayName.includes(' ');
  if (!hasFullName && !hasSpaceInName) {
    return { ready: false, blocker: 'Гэрчилгээнд овог нэрээ бүрэн оруулна уу.' };
  }
  return { ready: true, blocker: null };
}

export function computeCompletion(
  profile: UserServiceProfile,
  role: UserRole,
  email: string,
): CompletionResult {
  const emailPrefix = getEmailPrefix(email);

  const baseSteps: ProfileStep[] = [
    {
      key: 'display_name',
      label: 'Set your display name',
      labelMn: 'Харагдах нэр тохируулах',
      done: profile.displayName !== emailPrefix && profile.displayName.trim().length > 2,
      href: '/settings/profile#display-name',
      weight: 3,
    },
    {
      key: 'avatar',
      label: 'Upload a profile photo',
      labelMn: 'Профайл зураг оруулах',
      done: !!profile.avatarUrl,
      href: '/settings/profile#avatar',
      weight: 2,
    },
    {
      key: 'full_name',
      label: 'Add your full name',
      labelMn: 'Овог нэрээ оруулах',
      done: !!(profile.firstName && profile.lastName),
      href: '/settings/profile#full-name',
      weight: 2,
    },
    {
      key: 'bio',
      label: 'Write a short bio',
      labelMn: 'Товч тайлбар бичих',
      done: !!(profile.bio && profile.bio.trim().length > 10),
      href: '/settings/profile#bio',
      weight: 1,
    },
  ];

  const roleSteps: ProfileStep[] = [];

  if (role === 'INSTRUCTOR' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
    roleSteps.push(
      {
        key: 'headline',
        label: 'Add a professional headline',
        labelMn: 'Мэргэжлийн гарчиг нэмэх',
        done: !!(profile.headline && profile.headline.trim().length > 0),
        href: '/settings/profile#headline',
        weight: 2,
      },
      {
        key: 'expertise',
        label: 'Add expertise tags',
        labelMn: 'Мэдлэгийн чиглэл нэмэх',
        done: !!(profile.expertise && profile.expertise.length > 0),
        href: '/settings/profile#expertise',
        weight: 1,
      },
    );
  }

  if (role === 'STUDENT') {
    roleSteps.push({
      key: 'learning_goals',
      label: 'Set your learning goals',
      labelMn: 'Суралцах зорилгоо тохируулах',
      done: !!(profile.learningGoals && profile.learningGoals.length > 0),
      href: '/settings/profile#learning-goals',
      weight: 2,
    });
  }

  const steps = [...baseSteps, ...roleSteps];
  const totalWeight = steps.reduce((sum, s) => sum + s.weight, 0);
  const completedWeight = steps.filter((s) => s.done).reduce((sum, s) => sum + s.weight, 0);
  const score = totalWeight === 0 ? 100 : Math.round((completedWeight / totalWeight) * 100);

  const cert = isCertificateReady(profile, email);

  return {
    score,
    steps,
    isComplete: score >= 80,
    isCertificateReady: cert.ready,
    certificateBlocker: cert.blocker,
  };
}

export function getCompletionBadge(score: number): {
  label: string;
  labelMn: string;
  color: string;
} {
  if (score >= 100) return { label: 'Complete', labelMn: 'Бүрэн', color: 'text-green-700 bg-green-100' };
  if (score >= 80)  return { label: 'Almost there', labelMn: 'Бараг бүрэн', color: 'text-blue-700 bg-blue-100' };
  if (score >= 50)  return { label: 'In progress', labelMn: 'Хийгдэж байна', color: 'text-amber-700 bg-amber-100' };
  return { label: 'Just started', labelMn: 'Эхэлсэн', color: 'text-gray-600 bg-gray-100' };
}
