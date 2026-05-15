import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RevenueService } from '../revenue/revenue.service';

interface EnrollmentCreatedEvent {
  enrollmentId: string;
  courseId: string;
  studentId: string;
}

@Controller()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);
  private readonly courseServiceUrl: string;

  constructor(
    private readonly revenue: RevenueService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.courseServiceUrl = this.config.get<string>('COURSE_SERVICE_URL', 'http://course-service:3003');
  }

  @EventPattern('enrollment.created')
  async onEnrollmentCreated(@Payload() event: EnrollmentCreatedEvent): Promise<void> {
    this.logger.log(
      `Enrollment created — distributing revenue for enrollmentId=${event.enrollmentId} courseId=${event.courseId}`,
    );
    try {
      const resp = await firstValueFrom(
        this.http.get<{ data: { id: string; instructorId: string; price: string } }>(
          `${this.courseServiceUrl}/api/courses/${event.courseId}`,
        ),
      );
      const course = resp.data.data;
      const grossAmount = parseFloat(course.price ?? '0');

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
      // Swallow to ack the message and avoid requeue loop
      this.logger.error(`Revenue distribution failed for enrollmentId=${event.enrollmentId}`, err);
    }
  }
}
