import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventTypes } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { CourseClientService } from '../course-client/course-client.service';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import { SubmitBlockAnswersDto, AnswerItemDto } from './dto/submit-block-answers.dto';
import { BlockQuestion } from '../course-client/course-client.service';
import { Prisma, ProgressStatus } from '@prisma/client';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly courseClient: CourseClientService,
  ) {}

  async startLesson(enrollmentId: string, lessonId: string, studentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.studentId !== studentId) throw new ForbiddenException();

    const existing = await this.prisma.lessonProgress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    });

    if (!existing) {
      return this.prisma.lessonProgress.create({
        data: { enrollmentId, lessonId, status: ProgressStatus.IN_PROGRESS, unlockedAt: new Date() },
      });
    }

    if (existing.status === ProgressStatus.LOCKED) {
      return this.prisma.lessonProgress.update({
        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
        data: { status: ProgressStatus.IN_PROGRESS, unlockedAt: new Date() },
      });
    }

    return existing;
  }

  async submitBlockAnswers(
    enrollmentId: string,
    lessonId: string,
    interactiveBlockId: string,
    dto: SubmitBlockAnswersDto,
    studentId: string,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.studentId !== studentId) throw new ForbiddenException();

    const lessonProgress = await this.prisma.lessonProgress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    });
    if (!lessonProgress) throw new NotFoundException('Lesson progress not found');
    if (lessonProgress.status === ProgressStatus.LOCKED) throw new ForbiddenException('Lesson is locked');

    // Fetch block definition from course-service for answer evaluation
    const block = await this.courseClient.getBlock(interactiveBlockId);

    // Evaluate answers
    let totalScore = 0;
    let maxScore = 0;
    const evaluated: Array<{
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
      const result = this.evaluateAnswer(question, answerItem);
      totalScore += result.scoreAwarded;
      evaluated.push({
        questionId: answerItem.questionId,
        answerText: answerItem.answerText,
        selectedOptionIds: answerItem.selectedOptionIds,
        ...result,
      });
    }

    const passingScore = block.passingScore ?? 60;
    const scorePercent = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passed = scorePercent >= passingScore;

    // Upsert InteractiveBlockProgress + save answers
    await this.prisma.$transaction(async (tx) => {
      const blockProgress = await tx.interactiveBlockProgress.upsert({
        where: { lessonProgressId_interactiveBlockId: { lessonProgressId: lessonProgress.id, interactiveBlockId } },
        create: {
          lessonProgressId: lessonProgress.id,
          interactiveBlockId,
          score: totalScore,
          passed,
          completed: true,
          attempts: 1,
          completedAt: new Date(),
        },
        update: {
          score: totalScore,
          passed,
          completed: true,
          attempts: { increment: 1 },
          completedAt: new Date(),
        },
      });

      await tx.interactiveAnswer.deleteMany({ where: { interactiveBlockProgressId: blockProgress.id } });
      await tx.interactiveAnswer.createMany({
        data: evaluated.map((a) => ({
          interactiveBlockProgressId: blockProgress.id,
          questionId: a.questionId,
          answerText: a.answerText,
          selectedOptionIds: a.selectedOptionIds
            ? (a.selectedOptionIds as unknown as Prisma.InputJsonValue)
            : undefined,
          isCorrect: a.isCorrect,
          scoreAwarded: a.scoreAwarded,
        })),
      });

      await tx.lessonProgress.update({
        where: { id: lessonProgress.id },
        data: { score: totalScore },
      });
    });

    return { interactiveBlockId, score: totalScore, maxScore, scorePercent, passed, answers: evaluated };
  }

  private evaluateAnswer(
    question: BlockQuestion,
    answer: AnswerItemDto,
  ): { isCorrect: boolean | null; scoreAwarded: number } {
    const { questionType, score, options } = question;
    if (
      questionType === 'SINGLE_CHOICE' ||
      questionType === 'MULTIPLE_CHOICE' ||
      questionType === 'TRUE_FALSE'
    ) {
      const correctIds = options.filter((o) => o.isCorrect).map((o) => o.id);
      const selected = answer.selectedOptionIds ?? [];
      const isCorrect =
        selected.length === correctIds.length &&
        selected.every((id) => correctIds.includes(id)) &&
        correctIds.every((id) => selected.includes(id));
      return { isCorrect, scoreAwarded: isCorrect ? score : 0 };
    }
    return { isCorrect: null, scoreAwarded: 0 };
  }

  async updateLessonProgress(
    enrollmentId: string,
    lessonId: string,
    studentId: string,
    dto: UpdateLessonProgressDto,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.studentId !== studentId) throw new ForbiddenException();

    const lessonProgress = await this.prisma.lessonProgress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    });
    if (!lessonProgress) throw new NotFoundException('Lesson progress not found');
    if (lessonProgress.status === ProgressStatus.LOCKED) {
      throw new ForbiddenException('Lesson is locked');
    }

    const updated = await this.prisma.lessonProgress.update({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      data: {
        progressPercent: dto.progressPercent ?? lessonProgress.progressPercent,
        score: dto.score ?? lessonProgress.score,
        status: ProgressStatus.IN_PROGRESS,
      },
    });

    return updated;
  }

  async completeLesson(
    enrollmentId: string,
    lessonId: string,
    studentId: string,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { lessonProgresses: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.studentId !== studentId) throw new ForbiddenException();

    const lessonProgress = enrollment.lessonProgresses.find(
      (lp) => lp.lessonId === lessonId,
    );
    if (!lessonProgress) throw new NotFoundException('Lesson progress not found');
    if (lessonProgress.status === ProgressStatus.LOCKED) {
      throw new ForbiddenException('Lesson is locked');
    }
    if (lessonProgress.completed) return lessonProgress;

    await this.prisma.lessonProgress.update({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      data: {
        status: ProgressStatus.COMPLETED,
        completed: true,
        progressPercent: 100,
        completedAt: new Date(),
      },
    });

    this.messaging.publishEvent(EventTypes.LESSON_COMPLETED, {
      enrollmentId,
      courseId: enrollment.courseId,
      lessonId,
      studentId,
    });

    await this.unlockNextLesson(enrollment.courseId, enrollmentId, lessonId, enrollment.lessonProgresses);
    await this.recalculateEnrollmentProgress(enrollmentId);

    return this.prisma.lessonProgress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    });
  }

  private async getSortedLessons(courseId: string): Promise<Array<{
    lessonId: string;
    moduleOrder: number;
    lessonOrder: number;
    unlockNextOnPass: boolean;
  }> | null> {
    const lessons = await this.prisma.lessonProjection.findMany({
      where: { courseId, deletedAt: null },
      include: { module: { select: { sortOrder: true } } },
    });
    if (lessons.length === 0) return null;

    return lessons
      .map((l) => ({
        lessonId: l.lessonId,
        moduleOrder: l.module.sortOrder,
        lessonOrder: l.sortOrder,
        unlockNextOnPass: l.unlockNextOnPass,
      }))
      .sort((a, b) =>
        a.moduleOrder !== b.moduleOrder ? a.moduleOrder - b.moduleOrder : a.lessonOrder - b.lessonOrder,
      );
  }

  private async unlockNextLesson(
    courseId: string,
    enrollmentId: string,
    completedLessonId: string,
    allProgresses: { lessonId: string; status: ProgressStatus }[],
  ) {
    try {
      // Try projection first
      const projectionLessons = await this.getSortedLessons(courseId);

      let orderedIds: Array<{ id: string; unlockNextOnPass: boolean }>;
      let isSequential = true;

      if (projectionLessons && projectionLessons.length > 0) {
        orderedIds = projectionLessons.map((l) => ({ id: l.lessonId, unlockNextOnPass: l.unlockNextOnPass }));
        const proj = await this.prisma.courseProjection.findUnique({
          where: { courseId },
          select: { isSequential: true },
        });
        isSequential = proj?.isSequential ?? true;
        this.logger.debug(`unlockNext: using projection for courseId=${courseId}`);
      } else {
        // Fall back to HTTP
        this.logger.warn(`unlockNext: projection empty for courseId=${courseId}, falling back to HTTP`);
        const course = await this.courseClient.getCourse(courseId);
        isSequential = course.isSequential;
        orderedIds = course.modules
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .flatMap((m) =>
            m.lessons
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((l) => ({ id: l.id, unlockNextOnPass: l.unlockNextOnPass })),
          );
      }

      const completedIdx = orderedIds.findIndex((l) => l.id === completedLessonId);
      if (completedIdx === -1 || completedIdx >= orderedIds.length - 1) return;

      const completedLesson = orderedIds[completedIdx];
      if (!isSequential && !completedLesson.unlockNextOnPass) return;

      const nextLesson = orderedIds[completedIdx + 1];
      const nextProgress = allProgresses.find((lp) => lp.lessonId === nextLesson.id);
      if (nextProgress?.status === ProgressStatus.LOCKED) {
        await this.prisma.lessonProgress.update({
          where: { enrollmentId_lessonId: { enrollmentId, lessonId: nextLesson.id } },
          data: { status: ProgressStatus.IN_PROGRESS, unlockedAt: new Date() },
        });
        this.logger.log(`Unlocked lesson ${nextLesson.id} for enrollment ${enrollmentId}`);
      }
    } catch (err) {
      this.logger.warn(`Could not unlock next lesson: ${(err as Error).message}`);
    }
  }

  private async recalculateEnrollmentProgress(enrollmentId: string) {
    const [enrollment, progresses] = await Promise.all([
      this.prisma.enrollment.findUnique({ where: { id: enrollmentId } }),
      this.prisma.lessonProgress.findMany({ where: { enrollmentId } }),
    ]);

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const total = progresses.length;
    if (total === 0) return;

    const completedCount = progresses.filter((lp) => lp.completed).length;
    const progressPercent = Math.round((completedCount / total) * 100);
    const allCompleted = completedCount === total;

    const totalScore =
      progresses.reduce((sum, lp) => sum + (lp.score ?? 0), 0) / total;

    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progressPercent,
        totalScore: Math.round(totalScore * 100) / 100,
        completed: allCompleted,
        completedAt: allCompleted ? new Date() : null,
      },
    });

    if (allCompleted && !enrollment.completed) {
      let courseTitle: string | undefined;
      try {
        const course = await this.courseClient.getCourseBasic(enrollment.courseId);
        courseTitle = course.title;
      } catch (err) {
        this.logger.warn(`Could not fetch course title for certificate event: ${(err as Error).message}`);
      }

      this.messaging.publishEvent(EventTypes.ENROLLMENT_COMPLETED, {
        enrollmentId,
        courseId: enrollment.courseId,
        userId: enrollment.studentId,
        studentId: enrollment.studentId,
        courseTitle,
        completedAt: updatedEnrollment.completedAt?.toISOString() ?? new Date().toISOString(),
      });
    }
  }

  async getProgress(enrollmentId: string, studentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        lessonProgresses: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.studentId !== studentId) throw new ForbiddenException();
    return enrollment;
  }
}
