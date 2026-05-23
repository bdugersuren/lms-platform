import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  CourseContentEventEnvelope,
  CourseContentEventPatterns,
  EventTypes,
  PaymentConfirmedPayload,
} from '@lms/shared-types';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { CourseProjectionService } from '../course-projection/course-projection.service';
import { EventFailureService } from '../event-failure/event-failure.service';

@Controller()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(
    private readonly enrollmentService: EnrollmentService,
    private readonly courseProjection: CourseProjectionService,
    private readonly eventFailure: EventFailureService,
  ) {}

  @EventPattern(EventTypes.PAYMENT_CONFIRMED)
  async onPaymentConfirmed(@Payload() event: PaymentConfirmedPayload): Promise<void> {
    if (event.purpose !== 'COURSE_PURCHASE') {
      this.logger.debug(`Skipping enrollment for purpose=${event.purpose} paymentId=${event.paymentId}`);
      return;
    }

    if (!event.courseId) {
      this.logger.warn(`COURSE_PURCHASE event missing courseId, paymentId=${event.paymentId} — skipping`);
      return;
    }

    this.logger.log(
      `Payment confirmed — auto-enrolling userId=${event.userId} courseId=${event.courseId} paymentId=${event.paymentId}`,
    );
    try {
      await this.enrollmentService.enrollFromPayment(event.userId, event.courseId, event.paymentId);
    } catch (err) {
      this.logger.error(`Auto-enrollment failed for paymentId=${event.paymentId}`, err);
      await this.eventFailure.record({
        eventType: EventTypes.PAYMENT_CONFIRMED,
        consumer: 'enrollment-service',
        payload: event,
        error: err,
        eventId: event.paymentId,
      });
      throw err;
    }
  }

  @EventPattern(CourseContentEventPatterns.PUBLISHED)
  async onCoursePublished(
    @Payload() event: CourseContentEventEnvelope,
  ): Promise<void> {
    await this.courseProjection.handleCourseEvent(event);
  }

  @EventPattern(CourseContentEventPatterns.UPDATED)
  async onCourseUpdated(
    @Payload() event: CourseContentEventEnvelope,
  ): Promise<void> {
    await this.courseProjection.handleCourseEvent(event);
  }

  @EventPattern(CourseContentEventPatterns.LESSON_CREATED)
  async onLessonCreated(
    @Payload() event: CourseContentEventEnvelope,
  ): Promise<void> {
    await this.courseProjection.handleCourseEvent(event);
  }

  @EventPattern(CourseContentEventPatterns.LESSON_UPDATED)
  async onLessonUpdated(
    @Payload() event: CourseContentEventEnvelope,
  ): Promise<void> {
    await this.courseProjection.handleCourseEvent(event);
  }

  @EventPattern(CourseContentEventPatterns.LESSON_DELETED)
  async onLessonDeleted(
    @Payload() event: CourseContentEventEnvelope,
  ): Promise<void> {
    await this.courseProjection.handleCourseEvent(event);
  }

  @EventPattern(CourseContentEventPatterns.LESSON_REORDERED)
  async onLessonReordered(
    @Payload() event: CourseContentEventEnvelope,
  ): Promise<void> {
    await this.courseProjection.handleCourseEvent(event);
  }
}
