import {
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProgressStatus, QuestionType } from '@prisma/client';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { EventTypes, JwtPayload, UserRole } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import { SubmitBlockAnswersDto, AnswerItemDto } from './dto/submit-block-answers.dto';
import { isEnrollmentCutoverEnabled } from '../common/feature-flags';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  async startLesson(enrollmentId: string, lessonId: string, user: JwtPayload) {
    if (isEnrollmentCutoverEnabled()) {
      throw new GoneException(
        'Lesson progress is now managed by enrollment-service. Use POST /api/enrollments/:enrollmentId/progress/:lessonId/start.',
      );
    }

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    this.assertEnrollmentOwnerOrAdmin(enrollment.studentId, user);

    let progress = await this.prisma.lessonProgress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    });

    if (!progress) {
      progress = await this.prisma.lessonProgress.create({
        data: {
          enrollmentId,
          lessonId,
          status: ProgressStatus.IN_PROGRESS,
          unlockedAt: new Date(),
        },
      });
    } else if (progress.status === ProgressStatus.LOCKED) {
      progress = await this.prisma.lessonProgress.update({
        where: { id: progress.id },
        data: {
          status: ProgressStatus.IN_PROGRESS,
          unlockedAt: new Date(),
        },
      });
    }

    return ApiResponseBuilder.success(progress, 'Lesson started');
  }

  async updateLessonProgress(
    enrollmentId: string,
    lessonId: string,
    dto: UpdateLessonProgressDto,
    user: JwtPayload,
  ) {
    if (isEnrollmentCutoverEnabled()) {
      throw new GoneException(
        'Lesson progress is now managed by enrollment-service. Use PATCH /api/enrollments/:enrollmentId/progress/:lessonId.',
      );
    }

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    this.assertEnrollmentOwnerOrAdmin(enrollment.studentId, user);

    const progress = await this.prisma.lessonProgress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    });
    if (!progress) throw new NotFoundException('Lesson progress not found');

    const updated = await this.prisma.lessonProgress.update({
      where: { id: progress.id },
      data: {
        progressPercent: dto.progressPercent ?? progress.progressPercent,
        score: dto.score ?? progress.score,
      },
    });

    return ApiResponseBuilder.success(updated, 'Lesson progress updated');
  }

  async completeLesson(enrollmentId: string, lessonId: string, user: JwtPayload) {
    if (isEnrollmentCutoverEnabled()) {
      throw new GoneException(
        'Lesson completion is now managed by enrollment-service. Use POST /api/enrollments/:enrollmentId/progress/:lessonId/complete.',
      );
    }

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    this.assertEnrollmentOwnerOrAdmin(enrollment.studentId, user);

    const lessonProgress = await this.prisma.lessonProgress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    });
    if (!lessonProgress) throw new NotFoundException('Lesson progress not found');

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // Mark current lesson as completed
    await this.prisma.lessonProgress.update({
      where: { id: lessonProgress.id },
      data: {
        status: ProgressStatus.COMPLETED,
        completed: true,
        completedAt: new Date(),
        progressPercent: 100,
      },
    });

    // Unlock next lesson if sequential and lesson requires passing
    if (enrollment.course.isSequential && lesson.unlockNextOnPass) {
      const nextLesson = await this.findNextLesson(lesson.moduleId, lesson.sortOrder, lesson.module.courseId);

      if (nextLesson) {
        const nextProgress = await this.prisma.lessonProgress.findUnique({
          where: { enrollmentId_lessonId: { enrollmentId, lessonId: nextLesson.id } },
        });

        if (nextProgress && nextProgress.status === ProgressStatus.LOCKED) {
          await this.prisma.lessonProgress.update({
            where: { id: nextProgress.id },
            data: {
              status: ProgressStatus.IN_PROGRESS,
              unlockedAt: new Date(),
            },
          });
        }
      }
    }

    // Recalculate enrollment progress
    const allProgresses = await this.prisma.lessonProgress.findMany({
      where: { enrollmentId },
    });
    const completedCount = allProgresses.filter((p) => p.completed).length;
    const totalCount = allProgresses.length;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const allCompleted = totalCount > 0 && completedCount === totalCount;

    await this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        progressPercent,
        completed: allCompleted,
        completedAt: allCompleted ? new Date() : null,
      },
    });

    this.messaging.publishEvent(EventTypes.LESSON_COMPLETED, {
      enrollmentId,
      lessonId,
      studentId: user.sub,
      courseId: enrollment.courseId,
    });

    return ApiResponseBuilder.success(
      { progressPercent, allCompleted },
      'Lesson completed',
    );
  }

  async submitBlockAnswers(
    enrollmentId: string,
    blockProgressId: string,
    dto: SubmitBlockAnswersDto,
    user: JwtPayload,
  ) {
    if (isEnrollmentCutoverEnabled()) {
      throw new GoneException(
        'Interactive block answers are now managed by enrollment-service. Use POST /api/enrollments/:enrollmentId/progress/blocks/:blockProgressId/submit.',
      );
    }

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    this.assertEnrollmentOwnerOrAdmin(enrollment.studentId, user);

    const blockProgress = await this.prisma.interactiveBlockProgress.findUnique({
      where: { id: blockProgressId },
      include: {
        interactiveBlock: {
          include: {
            questions: { include: { options: true } },
          },
        },
        lessonProgress: true,
      },
    });
    if (!blockProgress) throw new NotFoundException('Block progress not found');
    if (blockProgress.lessonProgress.enrollmentId !== enrollmentId) {
      throw new ForbiddenException('Access denied');
    }

    const block = blockProgress.interactiveBlock;

    // Evaluate answers
    let totalScore = 0;
    let maxScore = 0;
    const evaluatedAnswers: Array<{
      questionId: string;
      answerText?: string;
      selectedOptionIds?: string[];
      isCorrect: boolean | null;
      scoreAwarded: number;
    }> = [];

    for (const answerItem of dto.answers) {
      const question = block.questions.find((q) => q.id === answerItem.questionId);
      if (!question) continue;

      maxScore += question.score;

      const evaluated = this.evaluateAnswer(question, answerItem);
      totalScore += evaluated.scoreAwarded;
      evaluatedAnswers.push({
        questionId: answerItem.questionId,
        answerText: answerItem.answerText,
        selectedOptionIds: answerItem.selectedOptionIds,
        ...evaluated,
      });
    }

    const passingScore = block.passingScore ?? 60;
    const scorePercent = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passed = scorePercent >= passingScore;

    // Save answers and update block progress
    await this.prisma.$transaction(async (tx) => {
      // Delete previous answers for this attempt
      await tx.interactiveAnswer.deleteMany({
        where: { interactiveBlockProgressId: blockProgressId },
      });

      // Create new answers
      await tx.interactiveAnswer.createMany({
        data: evaluatedAnswers.map((a) => ({
          interactiveBlockProgressId: blockProgressId,
          questionId: a.questionId,
          answerText: a.answerText,
          selectedOptionIds: a.selectedOptionIds
            ? (a.selectedOptionIds as unknown as import('@prisma/client').Prisma.InputJsonValue)
            : undefined,
          isCorrect: a.isCorrect,
          scoreAwarded: a.scoreAwarded,
        })),
      });

      // Update block progress
      await tx.interactiveBlockProgress.update({
        where: { id: blockProgressId },
        data: {
          score: totalScore,
          passed,
          completed: true,
          attempts: { increment: 1 },
          completedAt: new Date(),
        },
      });

      // Update lesson progress score
      await tx.lessonProgress.update({
        where: { id: blockProgress.lessonProgressId },
        data: { score: totalScore },
      });
    });

    return ApiResponseBuilder.success(
      {
        blockProgressId,
        score: totalScore,
        maxScore,
        scorePercent,
        passed,
        answers: evaluatedAnswers,
      },
      'Block answers submitted',
    );
  }

  async getFullProgress(enrollmentId: string, user: JwtPayload) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    this.assertEnrollmentOwnerOrAdmin(enrollment.studentId, user);

    const progresses = await this.prisma.lessonProgress.findMany({
      where: { enrollmentId },
      orderBy: { createdAt: 'asc' },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            sortOrder: true,
            moduleId: true,
          },
        },
        blockProgresses: {
          include: {
            interactiveBlock: {
              select: {
                id: true,
                title: true,
                blockType: true,
                sortOrder: true,
              },
            },
          },
        },
      },
    });

    return ApiResponseBuilder.success(
      { enrollment, progresses },
      'Full progress retrieved',
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private evaluateAnswer(
    question: { questionType: QuestionType; score: number; options: Array<{ id: string; isCorrect: boolean }> },
    answer: AnswerItemDto,
  ): { isCorrect: boolean | null; scoreAwarded: number } {
    const { questionType, score, options } = question;

    if (
      questionType === QuestionType.SINGLE_CHOICE ||
      questionType === QuestionType.MULTIPLE_CHOICE ||
      questionType === QuestionType.TRUE_FALSE
    ) {
      const correctOptionIds = options.filter((o) => o.isCorrect).map((o) => o.id);
      const selected = answer.selectedOptionIds ?? [];

      const isCorrect =
        selected.length === correctOptionIds.length &&
        selected.every((id) => correctOptionIds.includes(id)) &&
        correctOptionIds.every((id) => selected.includes(id));

      return { isCorrect, scoreAwarded: isCorrect ? score : 0 };
    }

    // SHORT_TEXT, ORDERING, MATCHING — pending AI evaluation
    return { isCorrect: null, scoreAwarded: 0 };
  }

  private async findNextLesson(
    currentModuleId: string,
    currentSortOrder: number,
    courseId: string,
  ) {
    // Try to find next lesson in same module
    const nextInModule = await this.prisma.lesson.findFirst({
      where: {
        moduleId: currentModuleId,
        sortOrder: { gt: currentSortOrder },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (nextInModule) return nextInModule;

    // Find the current module to get its sortOrder
    const currentModule = await this.prisma.module.findUnique({
      where: { id: currentModuleId },
    });
    if (!currentModule) return null;

    // Find next module
    const nextModule = await this.prisma.module.findFirst({
      where: {
        courseId,
        sortOrder: { gt: currentModule.sortOrder },
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        lessons: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    });

    return nextModule?.lessons[0] ?? null;
  }

  private assertEnrollmentOwnerOrAdmin(studentId: string, user: JwtPayload): void {
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    if (!isAdmin && user.sub !== studentId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
