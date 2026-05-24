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
      // Автомат гэрчилгээ нь PENDING болж үүснэ — сурагч хянаж баталгаажуулна
      await this.certificates.issuePending(
        {
          userId: event.userId,
          courseId: event.courseId,
          title: event.courseTitle ? `Гэрчилгээ: ${event.courseTitle}` : 'Сургалт дүүргэсний гэрчилгээ',
          recipientName: event.recipientName ?? 'Сурагч',
          description: event.courseTitle ?? undefined,
          completedAt: event.completedAt ?? new Date().toISOString(),
        },
        event.tenantId ?? 'demo',
      );
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
