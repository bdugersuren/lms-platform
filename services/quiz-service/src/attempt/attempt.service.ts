import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuizService } from '../quiz/quiz.service';
import { EventTypes } from '@lms/shared-types';
import { MessagingService } from '../messaging/messaging.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Injectable()
export class AttemptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quizService: QuizService,
    private readonly messaging: MessagingService,
  ) {}

  async startAttempt(quizId: string, studentId: string) {
    const quiz = await this.quizService.findOne(quizId);

    if (!quiz.isPublished) {
      throw new ForbiddenException('Quiz is not published yet');
    }

    await this.quizService.assertCanAttempt(quizId, studentId);

    const existing = await this.prisma.quizAttempt.findFirst({
      where: { quizId, studentId, status: 'IN_PROGRESS' },
    });
    if (existing) return existing;

    const expiresAt = quiz.timeLimit
      ? new Date(Date.now() + quiz.timeLimit * 60 * 1000)
      : null;

    return this.prisma.quizAttempt.create({
      data: {
        quizId,
        studentId,
        expiresAt: expiresAt ?? undefined,
      },
    });
  }

  async submitAttempt(quizId: string, attemptId: string, studentId: string, dto: SubmitAttemptDto) {
    const attempt = await this.getAttemptOrFail(quizId, attemptId, studentId);

    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Attempt already submitted');
    }

    if (attempt.expiresAt && attempt.expiresAt < new Date()) {
      await this.prisma.quizAttempt.update({
        where: { id: attemptId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Attempt has expired');
    }

    const quiz = await this.quizService.findOne(quizId);

    let totalEarned = 0;
    let totalPossible = 0;

    const answerData = await Promise.all(
      dto.answers.map(async (a) => {
        const question = quiz.questions.find((q) => q.id === a.questionId);
        if (!question) return null;

        totalPossible += question.score;

        let isCorrect = false;
        let earned = 0;

        if (question.questionType === 'SHORT_TEXT') {
          isCorrect = false;
        } else {
          const correctIds = question.options
            .filter((o) => o.isCorrect)
            .map((o) => o.id)
            .sort();
          const selectedSorted = [...(a.selectedOptionIds ?? [])].sort();
          isCorrect = JSON.stringify(correctIds) === JSON.stringify(selectedSorted);
        }

        if (isCorrect) {
          earned = question.score;
          totalEarned += earned;
        }

        return {
          attemptId,
          questionId: a.questionId,
          selectedOptionIds: a.selectedOptionIds ?? [],
          textAnswer: a.textAnswer,
          isCorrect,
          score: earned,
        };
      }),
    );

    const validAnswers = answerData.filter(Boolean) as NonNullable<typeof answerData[0]>[];

    const score = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
    const passed = score >= quiz.passingScore;

    await this.prisma.$transaction([
      this.prisma.attemptAnswer.createMany({ data: validAnswers }),
      this.prisma.quizAttempt.update({
        where: { id: attemptId },
        data: { status: 'GRADED', score, passed, submittedAt: new Date() },
      }),
    ]);

    const result = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });

    this.messaging.publishEvent(EventTypes.QUIZ_ATTEMPT_SUBMITTED, {
      quizId,
      studentId,
      attemptId,
      courseId: quiz.courseId ?? undefined,
      score,
      passed,
    });

    return result;
  }

  async getMyAttempts(quizId: string, studentId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { quizId, studentId },
      orderBy: { startedAt: 'desc' },
      include: { _count: { select: { answers: true } } },
    });
  }

  async getAttempt(quizId: string, attemptId: string, studentId: string) {
    return this.getAttemptOrFail(quizId, attemptId, studentId);
  }

  private async getAttemptOrFail(quizId: string, attemptId: string, studentId: string) {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, quizId, studentId },
      include: { answers: true },
    });
    if (!attempt) throw new NotFoundException(`Attempt ${attemptId} not found`);
    return attempt;
  }
}
