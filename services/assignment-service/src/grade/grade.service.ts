import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionService } from '../submission/submission.service';
import { EventTypes } from '@lms/shared-types';
import { MessagingService } from '../messaging/messaging.service';
import { CreateGradeDto } from './dto/create-grade.dto';

@Injectable()
export class GradeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionService: SubmissionService,
    private readonly messaging: MessagingService,
  ) {}

  async grade(submissionId: string, gradedBy: string, dto: CreateGradeDto) {
    const submission = await this.submissionService.getSubmission(submissionId);

    if (submission.status === 'DRAFT') {
      throw new BadRequestException('Cannot grade a draft submission');
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: submission.assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    if (dto.score > assignment.maxScore) {
      throw new BadRequestException(`Score cannot exceed max score (${assignment.maxScore})`);
    }

    const grade = await this.prisma.$transaction(async (tx) => {
      const g = await tx.grade.upsert({
        where: { submissionId },
        create: {
          submissionId,
          gradedBy,
          score: dto.score,
          maxScore: assignment.maxScore,
          feedback: dto.feedback,
          status: 'GRADED',
        },
        update: {
          gradedBy,
          score: dto.score,
          maxScore: assignment.maxScore,
          feedback: dto.feedback,
          status: 'GRADED',
          gradedAt: new Date(),
        },
      });

      await tx.submission.update({
        where: { id: submissionId },
        data: { status: 'GRADED' },
      });

      return g;
    });

    const passed = dto.score >= assignment.passingScore;

    this.messaging.publishEvent(EventTypes.ASSIGNMENT_SUBMISSION_GRADED, {
      submissionId,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      courseId: assignment.courseId,
      score: dto.score,
      maxScore: assignment.maxScore,
      passed,
    });

    return grade;
  }

  async getGrade(submissionId: string) {
    const grade = await this.prisma.grade.findUnique({ where: { submissionId } });
    if (!grade) throw new NotFoundException('Grade not found');
    return grade;
  }

  async returnSubmission(submissionId: string, feedback: string) {
    await this.submissionService.getSubmission(submissionId);
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'RETURNED' },
      include: { grade: true },
    });
  }
}
