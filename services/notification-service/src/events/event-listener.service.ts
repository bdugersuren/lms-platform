import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationType } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { ROUTING_KEYS } from '../messaging/messaging.constants';

interface AuthRegisteredEvent {
  userId: string;
  email: string;
  name?: string;
}

interface AssignmentGradedEvent {
  userId: string;
  email?: string;
  assignmentTitle: string;
  score: number;
  maxScore: number;
}

interface QuizCompletedEvent {
  userId: string;
  email?: string;
  quizTitle: string;
  score: number;
  passed: boolean;
}

interface CourseEnrolledEvent {
  userId: string;
  email?: string;
  courseTitle: string;
}

interface PaymentEvent {
  userId: string;
  email?: string;
  amount: string;
  currency?: string;
}

@Injectable()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(private readonly notifications: NotificationService) {}

  @EventPattern(ROUTING_KEYS.AUTH_REGISTERED)
  async onUserRegistered(@Payload() event: AuthRegisteredEvent): Promise<void> {
    this.logger.log(`User registered: ${event.userId}`);
    await this.notifications.send({
      userId: event.userId,
      type: NotificationType.SUCCESS,
      title: 'Welcome to LMS Platform! 🎉',
      body: `Your account has been created successfully. Start exploring courses!`,
      emailAddress: event.email,
    });
  }

  @EventPattern(ROUTING_KEYS.ASSIGNMENT_GRADED)
  async onAssignmentGraded(@Payload() event: AssignmentGradedEvent): Promise<void> {
    this.logger.log(`Assignment graded for user: ${event.userId}`);
    const pct = Math.round((event.score / event.maxScore) * 100);
    await this.notifications.send({
      userId: event.userId,
      type: NotificationType.ASSIGNMENT_GRADED,
      title: 'Assignment Graded',
      body: `Your submission for "${event.assignmentTitle}" has been graded: ${event.score}/${event.maxScore} (${pct}%)`,
      emailAddress: event.email,
    });
  }

  @EventPattern(ROUTING_KEYS.QUIZ_COMPLETED)
  async onQuizCompleted(@Payload() event: QuizCompletedEvent): Promise<void> {
    this.logger.log(`Quiz completed for user: ${event.userId}`);
    await this.notifications.send({
      userId: event.userId,
      type: NotificationType.QUIZ_RESULT,
      title: event.passed ? 'Quiz Passed! ✅' : 'Quiz Completed',
      body: `You scored ${event.score} on "${event.quizTitle}". ${event.passed ? 'Congratulations!' : 'Keep practicing!'}`,
      emailAddress: event.email,
    });
  }

  @EventPattern(ROUTING_KEYS.COURSE_ENROLLED)
  async onCourseEnrolled(@Payload() event: CourseEnrolledEvent): Promise<void> {
    this.logger.log(`Course enrolled for user: ${event.userId}`);
    await this.notifications.send({
      userId: event.userId,
      type: NotificationType.COURSE_ENROLLED,
      title: 'Course Enrollment Confirmed',
      body: `You have successfully enrolled in "${event.courseTitle}". Good luck!`,
      emailAddress: event.email,
    });
  }

  @EventPattern(ROUTING_KEYS.PAYMENT_CONFIRMED)
  async onPaymentConfirmed(@Payload() event: PaymentEvent): Promise<void> {
    this.logger.log(`Payment confirmed for user: ${event.userId}`);
    await this.notifications.send({
      userId: event.userId,
      type: NotificationType.PAYMENT_CONFIRMED,
      title: 'Payment Confirmed ✅',
      body: `Your payment of ${event.amount} ${event.currency ?? 'MNT'} has been confirmed successfully.`,
      emailAddress: event.email,
    });
  }

  @EventPattern(ROUTING_KEYS.PAYMENT_FAILED)
  async onPaymentFailed(@Payload() event: PaymentEvent): Promise<void> {
    this.logger.log(`Payment failed for user: ${event.userId}`);
    await this.notifications.send({
      userId: event.userId,
      type: NotificationType.PAYMENT_FAILED,
      title: 'Payment Failed ❌',
      body: `Your payment of ${event.amount} ${event.currency ?? 'MNT'} could not be processed. Please try again.`,
      emailAddress: event.email,
    });
  }
}
