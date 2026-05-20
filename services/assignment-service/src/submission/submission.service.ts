import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentService } from '../assignment/assignment.service';
import { EventTypes } from '@lms/shared-types';
import { MessagingService } from '../messaging/messaging.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class SubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentService: AssignmentService,
    private readonly messaging: MessagingService,
  ) {}

  async upsertDraft(assignmentId: string, studentId: string, dto: CreateSubmissionDto) {
    const assignment = await this.assignmentService.findOne(assignmentId);
    if (!assignment.isPublished) {
      throw new ForbiddenException('Assignment is not published');
    }

    return this.prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      create: {
        assignmentId,
        studentId,
        content: dto.content,
        fileUrls: dto.fileUrls ?? [],
        linkUrl: dto.linkUrl,
        status: 'DRAFT',
      },
      update: {
        content: dto.content,
        fileUrls: dto.fileUrls ?? [],
        linkUrl: dto.linkUrl,
        status: 'DRAFT',
      },
      include: { grade: true },
    });
  }

  async submit(assignmentId: string, studentId: string) {
    const assignment = await this.assignmentService.findOne(assignmentId);

    const submission = await this.prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });

    if (!submission) throw new NotFoundException('No draft found — save your work first');
    if (submission.status === 'SUBMITTED' || submission.status === 'GRADED') {
      throw new BadRequestException('Already submitted');
    }

    const isLate = assignment.dueDate ? new Date() > assignment.dueDate : false;
    if (isLate && !assignment.allowLate) {
      throw new ForbiddenException('Due date has passed');
    }

    const updated = await this.prisma.submission.update({
      where: { id: submission.id },
      data: { status: 'SUBMITTED', submittedAt: new Date(), isLate },
      include: { grade: true },
    });

    this.messaging.publishEvent(EventTypes.ASSIGNMENT_SUBMISSION_SUBMITTED, {
      assignmentId,
      submissionId: updated.id,
      studentId,
      isLate,
    });

    return updated;
  }

  async getMySubmission(assignmentId: string, studentId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      include: { grade: true },
    });
    if (!submission) throw new NotFoundException('No submission found');
    return submission;
  }

  async listByAssignment(assignmentId: string) {
    await this.assignmentService.findOne(assignmentId);
    return this.prisma.submission.findMany({
      where: { assignmentId },
      include: { grade: true },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getSubmission(id: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: { grade: true },
    });
    if (!submission) throw new NotFoundException(`Submission ${id} not found`);
    return submission;
  }
}
