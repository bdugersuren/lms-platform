import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { TRACKED_EVENTS } from '../messaging/messaging.constants';

@Injectable()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async ingest(eventType: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          eventType,
          userId: typeof payload['userId'] === 'string' ? payload['userId'] : undefined,
          courseId: typeof payload['courseId'] === 'string' ? payload['courseId'] : undefined,
          payload: payload as Parameters<typeof this.prisma.analyticsEvent.create>[0]['data']['payload'],
        },
      });
    } catch (err) {
      this.logger.error(`Failed to ingest event ${eventType}`, err);
    }
  }

  @EventPattern(TRACKED_EVENTS.USER_REGISTERED)
  async onUserRegistered(@Payload() p: Record<string, unknown>) {
    this.logger.debug(`Ingesting: ${TRACKED_EVENTS.USER_REGISTERED}`);
    await this.ingest(TRACKED_EVENTS.USER_REGISTERED, p);
  }

  @EventPattern(TRACKED_EVENTS.ENROLLMENT_CREATED)
  async onEnrollmentCreated(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.ENROLLMENT_CREATED, p);
  }

  @EventPattern(TRACKED_EVENTS.ENROLLMENT_COMPLETED)
  async onEnrollmentCompleted(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.ENROLLMENT_COMPLETED, p);
  }

  @EventPattern(TRACKED_EVENTS.PAYMENT_CONFIRMED)
  async onPaymentConfirmed(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.PAYMENT_CONFIRMED, p);
  }

  @EventPattern(TRACKED_EVENTS.PAYMENT_FAILED)
  async onPaymentFailed(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.PAYMENT_FAILED, p);
  }

  @EventPattern(TRACKED_EVENTS.QUIZ_COMPLETED)
  async onQuizCompleted(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.QUIZ_COMPLETED, p);
  }

  @EventPattern(TRACKED_EVENTS.ASSIGNMENT_GRADED)
  async onAssignmentGraded(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.ASSIGNMENT_GRADED, p);
  }

  @EventPattern(TRACKED_EVENTS.MEDIA_UPLOADED)
  async onMediaUploaded(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.MEDIA_UPLOADED, p);
  }

  @EventPattern(TRACKED_EVENTS.CERTIFICATE_ISSUED)
  async onCertificateIssued(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.CERTIFICATE_ISSUED, p);
  }

  @EventPattern(TRACKED_EVENTS.USER_LOGGED_IN)
  async onUserLoggedIn(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.USER_LOGGED_IN, p);
  }

  @EventPattern(TRACKED_EVENTS.LESSON_COMPLETED)
  async onLessonCompleted(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.LESSON_COMPLETED, p);
  }

  @EventPattern(TRACKED_EVENTS.ASSIGNMENT_SUBMITTED)
  async onAssignmentSubmitted(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.ASSIGNMENT_SUBMITTED, p);
  }

  @EventPattern(TRACKED_EVENTS.CERTIFICATE_REVOKED)
  async onCertificateRevoked(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.CERTIFICATE_REVOKED, p);
  }

  @EventPattern(TRACKED_EVENTS.WALLET_REVENUE_DISTRIBUTED)
  async onWalletRevenueDistributed(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.WALLET_REVENUE_DISTRIBUTED, p);
  }

  @EventPattern(TRACKED_EVENTS.COURSE_CREATED)
  async onCourseCreated(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.COURSE_CREATED, p);
  }

  @EventPattern(TRACKED_EVENTS.COURSE_PUBLISHED)
  async onCoursePublished(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.COURSE_PUBLISHED, p);
  }

  @EventPattern(TRACKED_EVENTS.COURSE_ARCHIVED)
  async onCourseArchived(@Payload() p: Record<string, unknown>) {
    await this.ingest(TRACKED_EVENTS.COURSE_ARCHIVED, p);
  }
}
