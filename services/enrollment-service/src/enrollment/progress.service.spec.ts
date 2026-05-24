import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProgressStatus } from '@prisma/client';
import { ProgressService } from './progress.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { CourseClientService } from '../course-client/course-client.service';
import { UserClientService } from '../user-client/user-client.service';

// ── Mock factories ────────────────────────────────────────────────────────────

const makeEnrollment = (overrides: Record<string, unknown> = {}) => ({
  id: 'enroll-1',
  tenantId: 'demo',
  courseId: 'course-1',
  studentId: 'student-1',
  progressPercent: 0,
  totalScore: 0,
  completed: false,
  enrolledAt: new Date(),
  completedAt: null,
  paymentId: null,
  lessonProgresses: [],
  ...overrides,
});

const makeLessonProgress = (overrides: Record<string, unknown> = {}) => ({
  id: 'lp-1',
  enrollmentId: 'enroll-1',
  lessonId: 'lesson-1',
  status: ProgressStatus.IN_PROGRESS,
  progressPercent: 0,
  score: 0,
  completed: false,
  unlockedAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeCourseProjection = (overrides: Record<string, unknown> = {}) => ({
  courseId: 'course-1',
  tenantId: 'demo',
  title: 'Test Course',
  slug: 'test-course',
  instructorId: 'inst-1',
  price: 0,
  status: 'PUBLISHED',
  isSequential: true,
  totalLessons: 1,
  totalMinutes: 60,
  contentVersion: 1,
  publishedAt: new Date(),
  deletedAt: null,
  requireQuizPass: false,
  requireAssignmentPass: false,
  minimumScorePercent: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ── Test suite ────────────────────────────────────────────────────────────────

describe('ProgressService', () => {
  let service: ProgressService;

  // Prisma mock — covers all tables used by ProgressService
  const mockPrisma = {
    enrollment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    lessonProgress: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    courseProjection: {
      findUnique: jest.fn(),
    },
    lessonProjection: {
      findMany: jest.fn(),
    },
    quizAttemptRecord: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    assignmentGradeRecord: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    interactiveBlockProgress: {
      upsert: jest.fn(),
    },
    interactiveAnswer: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMessaging = { publishEvent: jest.fn() };
  const mockCourseClient = {
    getBlock: jest.fn(),
    getCourse: jest.fn(),
    getCourseBasic: jest.fn(),
  };
  const mockUserClient = {
    getProfile: jest.fn(),
    getDisplayName: jest.fn().mockReturnValue('Test Student'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MessagingService, useValue: mockMessaging },
        { provide: CourseClientService, useValue: mockCourseClient },
        { provide: UserClientService, useValue: mockUserClient },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma),
    );
  });

  // ── startLesson ─────────────────────────────────────────────────────────────

  describe('startLesson()', () => {
    it('throws NotFoundException if enrollment not found', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);
      await expect(service.startLesson('enroll-x', 'lesson-1', 'student-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if student does not own enrollment', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(makeEnrollment({ studentId: 'other' }));
      await expect(service.startLesson('enroll-1', 'lesson-1', 'student-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('creates new LessonProgress with IN_PROGRESS when none exists', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(makeEnrollment());
      mockPrisma.lessonProgress.findUnique.mockResolvedValue(null);
      const created = makeLessonProgress({ status: ProgressStatus.IN_PROGRESS });
      mockPrisma.lessonProgress.create.mockResolvedValue(created);

      const result = await service.startLesson('enroll-1', 'lesson-1', 'student-1');
      expect(mockPrisma.lessonProgress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ProgressStatus.IN_PROGRESS }),
        }),
      );
      expect(result.status).toBe(ProgressStatus.IN_PROGRESS);
    });

    it('unlocks LOCKED lesson on start', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(makeEnrollment());
      const locked = makeLessonProgress({ status: ProgressStatus.LOCKED });
      mockPrisma.lessonProgress.findUnique.mockResolvedValue(locked);
      const updated = makeLessonProgress({ status: ProgressStatus.IN_PROGRESS });
      mockPrisma.lessonProgress.update.mockResolvedValue(updated);

      const result = await service.startLesson('enroll-1', 'lesson-1', 'student-1');
      expect(mockPrisma.lessonProgress.update).toHaveBeenCalled();
      expect(result.status).toBe(ProgressStatus.IN_PROGRESS);
    });

    it('returns existing progress if already IN_PROGRESS', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(makeEnrollment());
      const existing = makeLessonProgress({ status: ProgressStatus.IN_PROGRESS });
      mockPrisma.lessonProgress.findUnique.mockResolvedValue(existing);

      await service.startLesson('enroll-1', 'lesson-1', 'student-1');
      expect(mockPrisma.lessonProgress.create).not.toHaveBeenCalled();
      expect(mockPrisma.lessonProgress.update).not.toHaveBeenCalled();
    });
  });

  // ── evaluateAnswer (via submitBlockAnswers) ──────────────────────────────────

  describe('answer evaluation (via submitBlockAnswers)', () => {
    const setupSubmit = () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(makeEnrollment());
      mockPrisma.lessonProgress.findUnique.mockResolvedValue(
        makeLessonProgress({ status: ProgressStatus.IN_PROGRESS }),
      );
      mockPrisma.interactiveBlockProgress.upsert.mockResolvedValue({ id: 'bp-1' });
      mockPrisma.interactiveAnswer.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.interactiveAnswer.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.lessonProgress.update.mockResolvedValue(makeLessonProgress());
    };

    it('SINGLE_CHOICE: correct option → isCorrect=true, full score', async () => {
      setupSubmit();
      mockCourseClient.getBlock.mockResolvedValue({
        questions: [
          {
            id: 'q1',
            questionType: 'SINGLE_CHOICE',
            score: 10,
            options: [
              { id: 'opt-a', isCorrect: true },
              { id: 'opt-b', isCorrect: false },
            ],
          },
        ],
        passingScore: 60,
      });

      const result = await service.submitBlockAnswers(
        'enroll-1', 'lesson-1', 'block-1',
        { answers: [{ questionId: 'q1', selectedOptionIds: ['opt-a'] }] },
        'student-1',
      );

      expect(result.answers[0].isCorrect).toBe(true);
      expect(result.answers[0].scoreAwarded).toBe(10);
      expect(result.passed).toBe(true);
    });

    it('SINGLE_CHOICE: wrong option → isCorrect=false, zero score', async () => {
      setupSubmit();
      mockCourseClient.getBlock.mockResolvedValue({
        questions: [
          {
            id: 'q1',
            questionType: 'SINGLE_CHOICE',
            score: 10,
            options: [
              { id: 'opt-a', isCorrect: true },
              { id: 'opt-b', isCorrect: false },
            ],
          },
        ],
        passingScore: 60,
      });

      const result = await service.submitBlockAnswers(
        'enroll-1', 'lesson-1', 'block-1',
        { answers: [{ questionId: 'q1', selectedOptionIds: ['opt-b'] }] },
        'student-1',
      );

      expect(result.answers[0].isCorrect).toBe(false);
      expect(result.answers[0].scoreAwarded).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('MULTIPLE_CHOICE: partial selection → isCorrect=false', async () => {
      setupSubmit();
      mockCourseClient.getBlock.mockResolvedValue({
        questions: [
          {
            id: 'q1',
            questionType: 'MULTIPLE_CHOICE',
            score: 10,
            options: [
              { id: 'opt-a', isCorrect: true },
              { id: 'opt-b', isCorrect: true },
              { id: 'opt-c', isCorrect: false },
            ],
          },
        ],
        passingScore: 60,
      });

      const result = await service.submitBlockAnswers(
        'enroll-1', 'lesson-1', 'block-1',
        { answers: [{ questionId: 'q1', selectedOptionIds: ['opt-a'] }] }, // missing opt-b
        'student-1',
      );

      expect(result.answers[0].isCorrect).toBe(false);
    });

    it('MULTIPLE_CHOICE: all correct options selected → isCorrect=true', async () => {
      setupSubmit();
      mockCourseClient.getBlock.mockResolvedValue({
        questions: [
          {
            id: 'q1',
            questionType: 'MULTIPLE_CHOICE',
            score: 10,
            options: [
              { id: 'opt-a', isCorrect: true },
              { id: 'opt-b', isCorrect: true },
              { id: 'opt-c', isCorrect: false },
            ],
          },
        ],
        passingScore: 60,
      });

      const result = await service.submitBlockAnswers(
        'enroll-1', 'lesson-1', 'block-1',
        { answers: [{ questionId: 'q1', selectedOptionIds: ['opt-a', 'opt-b'] }] },
        'student-1',
      );

      expect(result.answers[0].isCorrect).toBe(true);
      expect(result.answers[0].scoreAwarded).toBe(10);
    });

    it('non-choice question type → isCorrect=null, scoreAwarded=0', async () => {
      setupSubmit();
      mockCourseClient.getBlock.mockResolvedValue({
        questions: [{ id: 'q1', questionType: 'ESSAY', score: 10, options: [] }],
        passingScore: 60,
      });

      const result = await service.submitBlockAnswers(
        'enroll-1', 'lesson-1', 'block-1',
        { answers: [{ questionId: 'q1', answerText: 'My essay' }] },
        'student-1',
      );

      expect(result.answers[0].isCorrect).toBeNull();
      expect(result.answers[0].scoreAwarded).toBe(0);
    });
  });

  // ── recalculateEnrollmentProgress / completion calculator ────────────────────

  describe('recalculateEnrollmentProgress (via recordQuizAttempt)', () => {
    const setupRecalc = (
      progresses: Array<{ completed: boolean; score: number }>,
      projection: Record<string, unknown> = {},
      quizRecords: Array<{ passed: boolean }> = [],
      assignmentRecords: Array<{ passed: boolean }> = [],
    ) => {
      const enrollment = makeEnrollment();
      // recordQuizAttempt uses findUnique with composite key
      mockPrisma.enrollment.findUnique
        .mockResolvedValueOnce(enrollment)    // recordQuizAttempt: composite key lookup
        .mockResolvedValueOnce(enrollment)    // recalculate: findUnique(id) — enrollment row
        .mockResolvedValueOnce(enrollment);   // recalculate: findUnique(id, select:courseId) for .then() chain

      mockPrisma.quizAttemptRecord.upsert.mockResolvedValue({});
      mockPrisma.lessonProgress.findMany.mockResolvedValue(
        progresses.map((p, i) => makeLessonProgress({ id: `lp-${i}`, ...p })),
      );
      mockPrisma.courseProjection.findUnique.mockResolvedValue(
        makeCourseProjection(projection),
      );
      mockPrisma.quizAttemptRecord.findMany.mockResolvedValue(quizRecords);
      mockPrisma.assignmentGradeRecord.findMany.mockResolvedValue(assignmentRecords);
      mockPrisma.enrollment.update.mockResolvedValue({ ...enrollment, completed: false });
      mockCourseClient.getCourseBasic.mockResolvedValue({ title: 'Test Course' });
      mockUserClient.getProfile.mockResolvedValue({ firstName: 'Test', lastName: 'Student' });
    };

    it('not all lessons done → completed=false', async () => {
      setupRecalc([
        { completed: true, score: 80 },
        { completed: false, score: 0 },
      ]);

      await service.recordQuizAttempt('course-1', 'student-1', 'quiz-1', true, 90);

      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ completed: false }) }),
      );
    });

    it('all lessons done, no policy → completed=true, ENROLLMENT_COMPLETED published', async () => {
      const enrollment = makeEnrollment({ completed: false });
      mockPrisma.enrollment.findUnique
        .mockResolvedValueOnce(enrollment)
        .mockResolvedValueOnce(enrollment)
        .mockResolvedValueOnce(enrollment);
      mockPrisma.quizAttemptRecord.upsert.mockResolvedValue({});
      mockPrisma.lessonProgress.findMany.mockResolvedValue([
        makeLessonProgress({ completed: true, score: 80 }),
      ]);
      mockPrisma.courseProjection.findUnique.mockResolvedValue(makeCourseProjection());
      mockPrisma.quizAttemptRecord.findMany.mockResolvedValue([]);
      mockPrisma.assignmentGradeRecord.findMany.mockResolvedValue([]);
      mockPrisma.enrollment.update.mockResolvedValue({
        ...enrollment,
        completed: true,
        completedAt: new Date(),
      });
      mockCourseClient.getCourseBasic.mockResolvedValue({ title: 'Test Course' });
      mockUserClient.getProfile.mockResolvedValue({ firstName: 'Test', lastName: 'Student' });

      await service.recordQuizAttempt('course-1', 'student-1', 'quiz-1', true, 90);

      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ completed: true }) }),
      );
      expect(mockMessaging.publishEvent).toHaveBeenCalledWith(
        'enrollment.completed',
        expect.objectContaining({ enrollmentId: 'enroll-1' }),
      );
    });

    it('requireQuizPass=true, no quiz records → completed=false', async () => {
      setupRecalc(
        [{ completed: true, score: 80 }],
        { requireQuizPass: true },
        [], // empty quiz records
      );

      await service.recordQuizAttempt('course-1', 'student-1', 'quiz-1', true, 90);

      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ completed: false }) }),
      );
    });

    it('requireQuizPass=true, quiz passed → completed=true', async () => {
      const enrollment = makeEnrollment({ completed: false });
      mockPrisma.enrollment.findUnique
        .mockResolvedValueOnce(enrollment)
        .mockResolvedValueOnce(enrollment)
        .mockResolvedValueOnce(enrollment);
      mockPrisma.quizAttemptRecord.upsert.mockResolvedValue({});
      mockPrisma.lessonProgress.findMany.mockResolvedValue([
        makeLessonProgress({ completed: true, score: 85 }),
      ]);
      mockPrisma.courseProjection.findUnique.mockResolvedValue(
        makeCourseProjection({ requireQuizPass: true }),
      );
      mockPrisma.quizAttemptRecord.findMany.mockResolvedValue([{ passed: true }]);
      mockPrisma.assignmentGradeRecord.findMany.mockResolvedValue([]);
      mockPrisma.enrollment.update.mockResolvedValue({ ...enrollment, completed: true, completedAt: new Date() });
      mockCourseClient.getCourseBasic.mockResolvedValue({ title: 'Test Course' });
      mockUserClient.getProfile.mockResolvedValue({ firstName: 'Test', lastName: 'Student' });

      await service.recordQuizAttempt('course-1', 'student-1', 'quiz-1', true, 85);

      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ completed: true }) }),
      );
    });

    it('requireQuizPass=true, quiz failed → completed=false', async () => {
      setupRecalc(
        [{ completed: true, score: 80 }],
        { requireQuizPass: true },
        [{ passed: false }],
      );

      await service.recordQuizAttempt('course-1', 'student-1', 'quiz-1', false, 40);

      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ completed: false }) }),
      );
    });

    it('requireAssignmentPass=true, assignment failed → completed=false', async () => {
      setupRecalc(
        [{ completed: true, score: 80 }],
        { requireAssignmentPass: true },
        [],
        [{ passed: false }],
      );

      await service.recordQuizAttempt('course-1', 'student-1', 'quiz-1', true, 90);

      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ completed: false }) }),
      );
    });

    it('minimumScorePercent=70, totalScore=65 → completed=false', async () => {
      setupRecalc(
        [{ completed: true, score: 65 }],
        { minimumScorePercent: 70 },
      );

      await service.recordQuizAttempt('course-1', 'student-1', 'quiz-1', true, 90);

      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ completed: false }) }),
      );
    });

    it('minimumScorePercent=70, totalScore=75 → completed=true', async () => {
      const enrollment = makeEnrollment({ completed: false });
      mockPrisma.enrollment.findUnique
        .mockResolvedValueOnce(enrollment)
        .mockResolvedValueOnce(enrollment)
        .mockResolvedValueOnce(enrollment);
      mockPrisma.quizAttemptRecord.upsert.mockResolvedValue({});
      mockPrisma.lessonProgress.findMany.mockResolvedValue([
        makeLessonProgress({ completed: true, score: 75 }),
      ]);
      mockPrisma.courseProjection.findUnique.mockResolvedValue(
        makeCourseProjection({ minimumScorePercent: 70 }),
      );
      mockPrisma.quizAttemptRecord.findMany.mockResolvedValue([]);
      mockPrisma.assignmentGradeRecord.findMany.mockResolvedValue([]);
      mockPrisma.enrollment.update.mockResolvedValue({ ...enrollment, completed: true, completedAt: new Date() });
      mockCourseClient.getCourseBasic.mockResolvedValue({ title: 'Test Course' });
      mockUserClient.getProfile.mockResolvedValue({ firstName: 'Test', lastName: 'Student' });

      await service.recordQuizAttempt('course-1', 'student-1', 'quiz-1', true, 90);

      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ completed: true }) }),
      );
    });

    it('progressPercent is calculated as completedCount/total * 100', async () => {
      setupRecalc([
        { completed: true, score: 80 },
        { completed: true, score: 60 },
        { completed: false, score: 0 },
      ]);

      await service.recordQuizAttempt('course-1', 'student-1', 'quiz-1', true, 90);

      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ progressPercent: 67 }), // round(2/3 * 100)
        }),
      );
    });
  });

  // ── recordQuizAttempt ────────────────────────────────────────────────────────

  describe('recordQuizAttempt()', () => {
    it('does nothing if enrollment not found', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);
      await service.recordQuizAttempt('course-x', 'student-1', 'quiz-1', true, 90);
      expect(mockPrisma.quizAttemptRecord.upsert).not.toHaveBeenCalled();
    });

    it('upserts QuizAttemptRecord and triggers recalculate', async () => {
      const enrollment = makeEnrollment();
      mockPrisma.enrollment.findUnique
        .mockResolvedValueOnce(enrollment)
        .mockResolvedValueOnce(enrollment)
        .mockResolvedValueOnce(enrollment);
      mockPrisma.quizAttemptRecord.upsert.mockResolvedValue({});
      mockPrisma.lessonProgress.findMany.mockResolvedValue([]);
      mockPrisma.courseProjection.findUnique.mockResolvedValue(makeCourseProjection());
      mockPrisma.quizAttemptRecord.findMany.mockResolvedValue([]);
      mockPrisma.assignmentGradeRecord.findMany.mockResolvedValue([]);
      mockPrisma.enrollment.update.mockResolvedValue(enrollment);

      await service.recordQuizAttempt('course-1', 'student-1', 'quiz-1', true, 90);

      expect(mockPrisma.quizAttemptRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { enrollmentId_quizId: { enrollmentId: 'enroll-1', quizId: 'quiz-1' } },
          create: expect.objectContaining({ passed: true, score: 90 }),
          update: expect.objectContaining({ passed: true, score: 90 }),
        }),
      );
    });
  });

  // ── recordAssignmentGrade ────────────────────────────────────────────────────

  describe('recordAssignmentGrade()', () => {
    it('does nothing if enrollment not found', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);
      await service.recordAssignmentGrade('course-x', 'student-1', 'assign-1', true, 80, 100);
      expect(mockPrisma.assignmentGradeRecord.upsert).not.toHaveBeenCalled();
    });

    it('upserts AssignmentGradeRecord with maxScore', async () => {
      const enrollment = makeEnrollment();
      mockPrisma.enrollment.findUnique
        .mockResolvedValueOnce(enrollment)
        .mockResolvedValueOnce(enrollment)
        .mockResolvedValueOnce(enrollment);
      mockPrisma.assignmentGradeRecord.upsert.mockResolvedValue({});
      mockPrisma.lessonProgress.findMany.mockResolvedValue([]);
      mockPrisma.courseProjection.findUnique.mockResolvedValue(makeCourseProjection());
      mockPrisma.quizAttemptRecord.findMany.mockResolvedValue([]);
      mockPrisma.assignmentGradeRecord.findMany.mockResolvedValue([]);
      mockPrisma.enrollment.update.mockResolvedValue(enrollment);

      await service.recordAssignmentGrade('course-1', 'student-1', 'assign-1', true, 80, 100);

      expect(mockPrisma.assignmentGradeRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ passed: true, score: 80, maxScore: 100 }),
          update: expect.objectContaining({ passed: true, score: 80, maxScore: 100 }),
        }),
      );
    });
  });
});
