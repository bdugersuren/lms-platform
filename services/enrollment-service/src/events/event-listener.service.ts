import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EnrollmentService } from '../enrollment/enrollment.service';

interface PaymentConfirmedEvent {
  paymentId: string;
  userId: string;
  courseId: string;
  amount: string;
  currency: string;
  provider: string;
}

@Controller()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(private readonly enrollmentService: EnrollmentService) {}

  @EventPattern('payment.confirmed')
  async onPaymentConfirmed(@Payload() event: PaymentConfirmedEvent): Promise<void> {
    this.logger.log(
      `Payment confirmed — auto-enrolling userId=${event.userId} courseId=${event.courseId} paymentId=${event.paymentId}`,
    );
    try {
      await this.enrollmentService.enrollFromPayment(event.userId, event.courseId, event.paymentId);
    } catch (err) {
      // Swallow error to ack the message — prevents infinite nack/requeue loop
      this.logger.error(`Auto-enrollment failed for paymentId=${event.paymentId}`, err);
    }
  }
}
