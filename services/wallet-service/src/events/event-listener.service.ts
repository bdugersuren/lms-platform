import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  CourseContentEventEnvelope,
  CourseContentEventPatterns,
  EnrollmentCreatedPayload,
  EventTypes,
  PaymentConfirmedPayload,
} from '@lms/shared-types';
import { RevenueService } from '../revenue/revenue.service';
import { EventFailureService } from '../event-failure/event-failure.service';
import { CourseProjectionService } from '../course-projection/course-projection.service';
import { WalletService } from '../wallet/wallet.service';

@Controller()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(
    private readonly revenue: RevenueService,
    private readonly eventFailure: EventFailureService,
    private readonly courseProjection: CourseProjectionService,
    private readonly walletService: WalletService,
  ) {}

  @EventPattern(EventTypes.PAYMENT_CONFIRMED)
  async onPaymentConfirmed(@Payload() event: PaymentConfirmedPayload): Promise<void> {
    if (event.purpose !== 'WALLET_TOPUP') {
      this.logger.debug(
        `Skipping payment.confirmed — purpose=${event.purpose} paymentId=${event.paymentId}`,
      );
      return;
    }

    const userId = event.walletOwnerId ?? event.userId;
    this.logger.log(
      `Wallet topup — crediting userId=${userId} amount=${event.amount} paymentId=${event.paymentId}`,
    );

    try {
      await this.walletService.getOrCreate(userId);
      await this.walletService.credit(
        userId,
        parseFloat(event.amount),
        'Хэтэвч цэнэглэлт',
        'WALLET_TOPUP',
        `payment:${event.paymentId}`,
      );
      this.logger.log(`Wallet credited for paymentId=${event.paymentId}`);
    } catch (err) {
      this.logger.error(`Wallet topup failed for paymentId=${event.paymentId}`, err);
      await this.eventFailure.record({
        eventType: EventTypes.PAYMENT_CONFIRMED,
        consumer: 'wallet-service',
        payload: event,
        error: err,
        eventId: event.paymentId,
      });
      throw err;
    }
  }

  @EventPattern(EventTypes.ENROLLMENT_CREATED)
  async onEnrollmentCreated(@Payload() event: EnrollmentCreatedPayload): Promise<void> {
    this.logger.log(
      `Enrollment created — distributing revenue for enrollmentId=${event.enrollmentId} courseId=${event.courseId}`,
    );
    try {
      const course = await this.courseProjection.findCourse(event.courseId);

      if (!course) {
        this.logger.warn(`CourseProjection not found for courseId=${event.courseId} — skipping revenue`);
        return;
      }

      const grossAmount = parseFloat(course.price.toString());

      if (grossAmount <= 0) {
        this.logger.debug(`Course ${event.courseId} is free — skipping revenue distribution`);
        return;
      }

      await this.revenue.distributeRevenue(
        course.instructorId,
        event.courseId,
        event.enrollmentId,
        grossAmount,
      );

      this.logger.log(
        `Revenue distributed for enrollmentId=${event.enrollmentId} instructorId=${course.instructorId}`,
      );
    } catch (err) {
      this.logger.error(`Revenue distribution failed for enrollmentId=${event.enrollmentId}`, err);
      await this.eventFailure.record({
        eventType: EventTypes.ENROLLMENT_CREATED,
        consumer: 'wallet-service',
        payload: event,
        error: err,
        eventId: event.enrollmentId,
      });
      throw err;
    }
  }

  @EventPattern(CourseContentEventPatterns.PUBLISHED)
  async onCoursePublished(@Payload() envelope: CourseContentEventEnvelope): Promise<void> {
    await this.courseProjection.handleCourseEvent(envelope);
  }

  @EventPattern(CourseContentEventPatterns.UPDATED)
  async onCourseUpdated(@Payload() envelope: CourseContentEventEnvelope): Promise<void> {
    await this.courseProjection.handleCourseEvent(envelope);
  }
}
