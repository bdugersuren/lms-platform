import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EventTypes } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { DmojHttpService } from '../dmoj/dmoj-http.service';
import { AssignmentHttpService } from './assignment-http.service';
import { CodingService } from '../coding/coding.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class SubmissionService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(SubmissionService.name);
  private pollTimer?: NodeJS.Timeout;
  private polling = false;
  private serviceToken: string | null = null;
  private serviceTokenExpiry = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly dmoj: DmojHttpService,
    private readonly assignmentHttp: AssignmentHttpService,
    private readonly codingService: CodingService,
    private readonly config: ConfigService,
  ) {}

  async submit(
    assignmentId: string,
    dto: CreateSubmissionDto,
    studentId: string,
    tenantId: string,
    userToken: string,
  ) {
    const binding = await this.codingService.getBinding(assignmentId);

    if (!binding.isActive) {
      throw new BadRequestException('Code judge is not active for this assignment');
    }

    const allowed = this.codingService.getLanguages(binding);
    if (!allowed.includes(dto.language)) {
      throw new BadRequestException(`Language ${dto.language} not allowed. Allowed: ${allowed.join(', ')}`);
    }

    const sourceHash = crypto.createHash('sha256').update(dto.code).digest('hex');

    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.codeSubmission.create({
        data: {
          tenantId,
          bindingId: binding.id,
          assignmentId,
          studentId,
          language: dto.language,
          sourceHash,
          status: 'QUEUED',
        },
      });

      await this.outbox.enqueue(tx, {
        eventId: crypto.randomUUID(),
        eventType: EventTypes.CODING_SUBMISSION_QUEUED,
        eventVersion: 1,
        producer: 'coding-service',
        sequence: 0,
        aggregateType: 'CodeSubmission',
        aggregateId: submission.id,
        occurredAt: new Date().toISOString(),
        payload: {
          codingSubmissionId: submission.id,
          assignmentId,
          studentId,
          tenantId,
          language: dto.language,
          queuedAt: submission.createdAt.toISOString(),
        },
      });

      setImmediate(() => void this.processQueued(submission.id, dto.code, userToken));

      return submission;
    });
  }

  private async processQueued(submissionId: string, code: string, userToken: string): Promise<void> {
    try {
      const submission = await this.prisma.codeSubmission.findUniqueOrThrow({
        where: { id: submissionId },
        include: { binding: true },
      });

      // Create LMS assignment-service submission record
      const lmsSubmissionId = await this.assignmentHttp.createSubmission({
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        content: `[AUTO] DMOJ submission - language: ${submission.language}, hash: ${submission.sourceHash}`,
        token: userToken,
      });

      // Submit to DMOJ
      const dmojSubmissionId = await this.dmoj.submitCode({
        problem: submission.binding.dmojProblemCode,
        language: submission.language,
        source: code,
      });

      await this.prisma.codeSubmission.update({
        where: { id: submissionId },
        data: { lmsSubmissionId, dmojSubmissionId, status: 'SUBMITTED' },
      });

      this.logger.log(`Submission ${submissionId} → DMOJ #${dmojSubmissionId}`);
    } catch (err) {
      this.logger.error(`Failed to process submission ${submissionId}`, err);
      await this.prisma.codeSubmission.update({
        where: { id: submissionId },
        data: { status: 'FAILED', lastError: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  async pollPending(): Promise<void> {
    if (this.polling) return;
    this.polling = true;

    try {
      const pending = await this.prisma.codeSubmission.findMany({
        where: {
          status: { in: ['SUBMITTED', 'JUDGING'] },
          dmojSubmissionId: { not: null },
        },
        include: { binding: true },
        take: 20,
      });

      for (const sub of pending) {
        await this.pollSubmission(sub).catch((err) => {
          this.logger.error(`Poll failed for ${sub.id}`, err);
        });
      }
    } finally {
      this.polling = false;
    }
  }

  private async pollSubmission(sub: {
    id: string;
    dmojSubmissionId: number | null;
    lmsSubmissionId: string | null;
    assignmentId: string;
    studentId: string;
    tenantId: string;
    pollCount: number;
    binding: { passingScore: number; maxScore: number };
  }): Promise<void> {
    if (!sub.dmojSubmissionId) return;

    const result = await this.dmoj.getSubmission(sub.dmojSubmissionId);
    if (!result) return;

    if (result.status === 'G' || result.status === 'QU') {
      // Still judging
      await this.prisma.codeSubmission.update({
        where: { id: sub.id },
        data: { status: 'JUDGING', pollCount: { increment: 1 } },
      });
      return;
    }

    // Done — result.status === 'D' or error
    const score = result.score ?? 0;
    const maxScore = result.max_score ?? sub.binding.maxScore;
    const passed = score >= sub.binding.passingScore;
    const timeMs = result.time ? Math.round(result.time * 1000) : null;
    const memoryKb = result.memory ?? null;

    await this.prisma.$transaction(async (tx) => {
      // Save cases
      if (result.cases?.length) {
        await tx.codeSubmissionCase.createMany({
          data: result.cases.map((c) => ({
            submissionId: sub.id,
            caseNumber: c.case,
            status: c.status,
            timeMs: c.time ? Math.round(c.time * 1000) : null,
            memoryKb: c.memory ?? null,
            score: c.points,
            maxScore: c.total,
          })),
          skipDuplicates: true,
        });
      }

      await tx.codeSubmission.update({
        where: { id: sub.id },
        data: {
          status: 'GRADED',
          score,
          maxScore,
          timeMs,
          memoryKb,
          gradedAt: new Date(),
          pollCount: { increment: 1 },
        },
      });

      // Grade the LMS submission
      if (sub.lmsSubmissionId) {
        const token = await this.getServiceToken();
        await this.assignmentHttp.gradeSubmission({
          submissionId: sub.lmsSubmissionId,
          score,
          maxScore,
          passed,
          feedback: `DMOJ #${sub.dmojSubmissionId} — ${result.result}`,
          token,
        });
      }

      await this.outbox.enqueue(tx, {
        eventId: crypto.randomUUID(),
        eventType: EventTypes.CODING_SUBMISSION_GRADED,
        eventVersion: 1,
        producer: 'coding-service',
        sequence: 0,
        aggregateType: 'CodeSubmission',
        aggregateId: sub.id,
        occurredAt: new Date().toISOString(),
        payload: {
          codingSubmissionId: sub.id,
          lmsSubmissionId: sub.lmsSubmissionId ?? '',
          assignmentId: sub.assignmentId,
          studentId: sub.studentId,
          tenantId: sub.tenantId,
          dmojSubmissionId: sub.dmojSubmissionId,
          score,
          maxScore,
          passed,
          timeMs,
          memoryKb,
          gradedAt: new Date().toISOString(),
        },
      });
    });

    this.logger.log(
      `Submission ${sub.id} graded: ${score}/${maxScore} (${passed ? 'PASS' : 'FAIL'})`,
    );
  }

  private async getServiceToken(): Promise<string> {
    if (this.serviceToken && Date.now() < this.serviceTokenExpiry) return this.serviceToken;
    // Reuse DmojHttpService internal token mechanism — simplified: use env-provided token
    // In production this would call auth-service login endpoint
    const token = this.config.get<string>('CODING_SERVICE_JWT_OVERRIDE', '');
    if (!token) {
      throw new Error('CODING_SERVICE_JWT_OVERRIDE not set — cannot grade without service JWT');
    }
    this.serviceToken = token;
    this.serviceTokenExpiry = Date.now() + 9 * 60 * 1000;
    return token;
  }

  async getSubmission(submissionId: string, userId: string) {
    const sub = await this.prisma.codeSubmission.findUnique({
      where: { id: submissionId },
      include: { cases: { orderBy: { caseNumber: 'asc' } } },
    });
    if (!sub) throw new NotFoundException('Submission not found');
    if (sub.studentId !== userId) throw new NotFoundException('Submission not found');
    return sub;
  }

  async getMySubmissions(assignmentId: string, studentId: string) {
    return this.prisma.codeSubmission.findMany({
      where: { assignmentId, studentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getAllSubmissions(assignmentId: string) {
    return this.prisma.codeSubmission.findMany({
      where: { assignmentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    const intervalMs = this.config.get<number>('DMOJ_RESULT_SYNC_INTERVAL_MS', 5000);
    this.pollTimer = setInterval(() => void this.pollPending(), intervalMs);
    this.pollTimer.unref?.();
    this.logger.log(`DMOJ polling worker started (interval: ${intervalMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }
}
