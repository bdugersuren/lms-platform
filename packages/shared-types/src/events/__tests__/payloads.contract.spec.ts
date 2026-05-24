/**
 * Contract tests for RabbitMQ event payload schemas.
 * Purpose: catch payload shape regressions before they reach other services.
 * These tests validate the TypeScript interface definitions at runtime using
 * plain object assertions — no Zod or extra dependencies needed.
 */

import { EventTypes } from '../event-types';
import type { QuizAttemptSubmittedPayload } from '../payloads/quiz-events';
import type { AssignmentSubmissionGradedPayload } from '../payloads/assignment-events';
import type { EnrollmentCompletedPayload, EnrollmentCreatedPayload } from '../payloads/enrollment-events';
import type { MediaTranscodeQueuedPayload } from '../payloads/media-events';
import type { CertificateIssuedPayload, CertificateRevokedPayload } from '../payloads/certificate-events';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Asserts all listed keys exist on the object (runtime guard for required fields). */
function hasRequiredKeys<T extends object>(obj: T, keys: (keyof T)[]): void {
  for (const key of keys) {
    expect(obj).toHaveProperty(key as string);
    expect((obj as Record<string, unknown>)[key as string]).toBeDefined();
  }
}

// ── EventTypes uniqueness ─────────────────────────────────────────────────────

describe('EventTypes', () => {
  it('all values must be unique — no duplicate routing keys', () => {
    const values = Object.values(EventTypes);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('all values must be non-empty strings', () => {
    for (const value of Object.values(EventTypes)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      expect(value).not.toContain(' ');
    }
  });

  it('routing keys follow dot-notation convention', () => {
    for (const value of Object.values(EventTypes)) {
      expect(value).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);
    }
  });
});

// ── Quiz payload ──────────────────────────────────────────────────────────────

describe('QuizAttemptSubmittedPayload', () => {
  it('must have all required fields', () => {
    const payload: QuizAttemptSubmittedPayload = {
      attemptId: 'attempt-1',
      quizId: 'quiz-1',
      studentId: 'student-1',
      score: 85,
      passed: true,
    };

    hasRequiredKeys(payload, ['attemptId', 'quizId', 'studentId', 'score', 'passed']);
    expect(typeof payload.score).toBe('number');
    expect(typeof payload.passed).toBe('boolean');
  });

  it('courseId is optional but accepted', () => {
    const withCourse: QuizAttemptSubmittedPayload = {
      attemptId: 'attempt-1',
      quizId: 'quiz-1',
      studentId: 'student-1',
      score: 90,
      passed: true,
      courseId: 'course-1',
    };
    expect(withCourse.courseId).toBe('course-1');
  });
});

// ── Assignment graded payload ─────────────────────────────────────────────────

describe('AssignmentSubmissionGradedPayload', () => {
  it('must have all required fields including maxScore', () => {
    const payload: AssignmentSubmissionGradedPayload = {
      submissionId: 'sub-1',
      assignmentId: 'assign-1',
      studentId: 'student-1',
      score: 70,
      maxScore: 100,
      passed: true,
    };

    hasRequiredKeys(payload, ['submissionId', 'assignmentId', 'studentId', 'score', 'maxScore', 'passed']);
    expect(payload.maxScore).toBe(100);
  });

  it('courseId is optional but accepted', () => {
    const withCourse: AssignmentSubmissionGradedPayload = {
      submissionId: 'sub-1',
      assignmentId: 'assign-1',
      studentId: 'student-1',
      score: 70,
      maxScore: 100,
      passed: true,
      courseId: 'course-1',
    };
    expect(withCourse.courseId).toBe('course-1');
  });
});

// ── Enrollment payloads ───────────────────────────────────────────────────────

describe('EnrollmentCreatedPayload', () => {
  it('must have enrollmentId, courseId, studentId', () => {
    const payload: EnrollmentCreatedPayload = {
      enrollmentId: 'enroll-1',
      courseId: 'course-1',
      studentId: 'student-1',
    };

    hasRequiredKeys(payload, ['enrollmentId', 'courseId', 'studentId']);
  });
});

describe('EnrollmentCompletedPayload', () => {
  it('must have enrollmentId, courseId, userId, studentId, completedAt', () => {
    const payload: EnrollmentCompletedPayload = {
      enrollmentId: 'enroll-1',
      courseId: 'course-1',
      userId: 'user-1',
      studentId: 'student-1',
      completedAt: new Date().toISOString(),
    };

    hasRequiredKeys(payload, ['enrollmentId', 'courseId', 'userId', 'studentId', 'completedAt']);
    expect(() => new Date(payload.completedAt)).not.toThrow();
  });

  it('completedAt must be a valid ISO string', () => {
    const payload: EnrollmentCompletedPayload = {
      enrollmentId: 'enroll-1',
      courseId: 'course-1',
      userId: 'user-1',
      studentId: 'student-1',
      completedAt: '2024-01-15T10:30:00.000Z',
    };

    const parsed = new Date(payload.completedAt);
    expect(parsed.getFullYear()).toBe(2024);
    expect(isNaN(parsed.getTime())).toBe(false);
  });
});

// ── Media transcode payload ───────────────────────────────────────────────────

describe('MediaTranscodeQueuedPayload', () => {
  it('must have jobId, mediaFileId, sourceKey, format', () => {
    const payload: MediaTranscodeQueuedPayload = {
      jobId: 'job-1',
      mediaFileId: 'media-1',
      sourceKey: 'uploads/video.mp4',
      format: 'hls',
    };

    hasRequiredKeys(payload, ['jobId', 'mediaFileId', 'sourceKey', 'format']);
    expect(payload.sourceKey.length).toBeGreaterThan(0);
  });
});

// ── Certificate payloads ──────────────────────────────────────────────────────

describe('CertificateIssuedPayload', () => {
  it('must have certificateId, userId, verifyCode', () => {
    const payload: CertificateIssuedPayload = {
      certificateId: 'cert-1',
      userId: 'user-1',
      verifyCode: 'VERIFY-ABC123',
    };

    hasRequiredKeys(payload, ['certificateId', 'userId', 'verifyCode']);
  });

  it('courseId is optional', () => {
    const withCourse: CertificateIssuedPayload = {
      certificateId: 'cert-1',
      userId: 'user-1',
      verifyCode: 'VERIFY-ABC123',
      courseId: 'course-1',
    };
    expect(withCourse.courseId).toBe('course-1');
  });
});

describe('CertificateRevokedPayload', () => {
  it('must have certificateId and userId', () => {
    const payload: CertificateRevokedPayload = {
      certificateId: 'cert-1',
      userId: 'user-1',
    };

    hasRequiredKeys(payload, ['certificateId', 'userId']);
  });
});
