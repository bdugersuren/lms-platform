import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EnrollmentCompletedPayload } from '@lms/shared-types';
import { CertificateService } from '../certificate/certificate.service';
import { EventFailureService } from '../event-failure/event-failure.service';
import { ROUTING_KEYS } from '../messaging/messaging.constants';

@Injectable()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(
    private readonly certificates: CertificateService,
    private readonly eventFailure: EventFailureService,
  ) {}

  @EventPattern(ROUTING_KEYS.ENROLLMENT_COMPLETED)
  async onEnrollmentCompleted(@Payload() event: EnrollmentCompletedPayload): Promise<void> {
    this.logger.log(`Course completed: user=${event.userId} course=${event.courseId}`);
    try {
      await this.certificates.issue({
        userId: event.userId,
        courseId: event.courseId,
        title: 'Certificate of Completion',
        recipientName: event.recipientName ?? 'Student',
        description: event.courseTitle ?? undefined,
        completedAt: event.completedAt ?? new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error(`Auto-issue failed for user ${event.userId}`, err);
      await this.eventFailure.record({
        eventType: ROUTING_KEYS.ENROLLMENT_COMPLETED,
        consumer: 'certificate-service',
        payload: event,
        error: err,
        eventId: event.enrollmentId,
      });
      throw err;
    }
  }
}
