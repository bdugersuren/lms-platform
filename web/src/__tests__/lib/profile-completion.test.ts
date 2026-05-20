import { describe, it, expect } from 'vitest';
import {
  computeCompletion,
  isCertificateReady,
  getEmailPrefix,
  getCompletionBadge,
} from '@/lib/profile-completion';
import type { UserServiceProfile } from '@/types/user';

const baseProfile: UserServiceProfile = {
  id: 'user-1',
  displayName: 'batbayar',
  firstName: null,
  lastName: null,
  avatarUrl: null,
  bio: null,
  headline: null,
  expertise: [],
  learningGoals: [],
  locale: 'mn',
  timezone: 'Asia/Ulaanbaatar',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

const email = 'batbayar@example.com';

describe('getEmailPrefix', () => {
  it('returns the part before @', () => {
    expect(getEmailPrefix('batbayar@example.com')).toBe('batbayar');
    expect(getEmailPrefix('john.doe@corp.mn')).toBe('john.doe');
  });
});

describe('isCertificateReady', () => {
  it('blocks when displayName equals email prefix', () => {
    const r = isCertificateReady({ displayName: 'batbayar', firstName: null, lastName: null }, email);
    expect(r.ready).toBe(false);
    expect(r.blocker).toBeTruthy();
  });

  it('blocks when displayName is too short', () => {
    const r = isCertificateReady({ displayName: 'AB', firstName: null, lastName: null }, email);
    expect(r.ready).toBe(false);
  });

  it('blocks when displayName has no space and no firstName/lastName', () => {
    const r = isCertificateReady({ displayName: 'Batbayar', firstName: null, lastName: null }, email);
    expect(r.ready).toBe(false);
  });

  it('passes when displayName has a space', () => {
    const r = isCertificateReady({ displayName: 'Batbayar Bold', firstName: null, lastName: null }, email);
    expect(r.ready).toBe(true);
    expect(r.blocker).toBeNull();
  });

  it('passes when firstName and lastName are both set', () => {
    const r = isCertificateReady({ displayName: 'Batbayar', firstName: 'Batbayar', lastName: 'Bold' }, email);
    expect(r.ready).toBe(true);
  });
});

describe('computeCompletion — STUDENT role', () => {
  it('returns score 0 for a fresh auto-generated profile', () => {
    const result = computeCompletion(baseProfile, 'STUDENT', email);
    expect(result.score).toBe(0);
    expect(result.isComplete).toBe(false);
    expect(result.isCertificateReady).toBe(false);
  });

  it('increments score when displayName is customized', () => {
    const profile = { ...baseProfile, displayName: 'Батбаяр Болд' };
    const result = computeCompletion(profile, 'STUDENT', email);
    const nameStep = result.steps.find((s) => s.key === 'display_name')!;
    expect(nameStep.done).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('includes learning_goals step for STUDENT role', () => {
    const result = computeCompletion(baseProfile, 'STUDENT', email);
    expect(result.steps.some((s) => s.key === 'learning_goals')).toBe(true);
  });

  it('does NOT include headline step for STUDENT role', () => {
    const result = computeCompletion(baseProfile, 'STUDENT', email);
    expect(result.steps.some((s) => s.key === 'headline')).toBe(false);
  });

  it('marks learning_goals done when goals are set', () => {
    const profile = { ...baseProfile, learningGoals: ['career_change', 'certification'] };
    const result = computeCompletion(profile, 'STUDENT', email);
    const step = result.steps.find((s) => s.key === 'learning_goals')!;
    expect(step.done).toBe(true);
  });

  it('reaches 100% when all STUDENT fields are complete', () => {
    const profile: UserServiceProfile = {
      ...baseProfile,
      displayName: 'Батбаяр Болд',
      firstName: 'Батбаяр',
      lastName: 'Болд',
      avatarUrl: 'https://cdn.example.com/avatar.jpg',
      bio: 'Би программист, 5 жилийн туршлагатай.',
      learningGoals: ['skill_upgrade'],
    };
    const result = computeCompletion(profile, 'STUDENT', email);
    expect(result.score).toBe(100);
    expect(result.isComplete).toBe(true);
    expect(result.isCertificateReady).toBe(true);
  });
});

describe('computeCompletion — INSTRUCTOR role', () => {
  it('includes headline and expertise steps for INSTRUCTOR', () => {
    const result = computeCompletion(baseProfile, 'INSTRUCTOR', email);
    expect(result.steps.some((s) => s.key === 'headline')).toBe(true);
    expect(result.steps.some((s) => s.key === 'expertise')).toBe(true);
  });

  it('does NOT include learning_goals step for INSTRUCTOR', () => {
    const result = computeCompletion(baseProfile, 'INSTRUCTOR', email);
    expect(result.steps.some((s) => s.key === 'learning_goals')).toBe(false);
  });

  it('marks headline done when set', () => {
    const profile = { ...baseProfile, headline: 'Senior Web Developer' };
    const result = computeCompletion(profile, 'INSTRUCTOR', email);
    const step = result.steps.find((s) => s.key === 'headline')!;
    expect(step.done).toBe(true);
  });
});

describe('computeCompletion — ADMIN role', () => {
  it('includes instructor steps for ADMIN', () => {
    const result = computeCompletion(baseProfile, 'ADMIN', email);
    expect(result.steps.some((s) => s.key === 'headline')).toBe(true);
  });
});

describe('getCompletionBadge', () => {
  it('returns correct badge at each threshold', () => {
    expect(getCompletionBadge(100).label).toBe('Complete');
    expect(getCompletionBadge(80).label).toBe('Almost there');
    expect(getCompletionBadge(50).label).toBe('In progress');
    expect(getCompletionBadge(10).label).toBe('Just started');
  });
});
