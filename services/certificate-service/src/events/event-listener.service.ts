import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CertificateService } from '../certificate/certificate.service';
import { ROUTING_KEYS } from '../messaging/messaging.constants';

interface EnrollmentCompletedEvent {
  userId: string;
  courseId: string;
  recipientName?: string;
  courseTitle?: string;
  completedAt?: string;
}

@Injectable()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(private readonly certificates: CertificateService) {}

  @EventPattern(ROUTING_KEYS.ENROLLMENT_COMPLETED)
  async onEnrollmentCompleted(@Payload() event: EnrollmentCompletedEvent): Promise<void> {
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
    }
  }
}
