import { Module } from '@nestjs/common';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { CourseProjectionModule } from '../course-projection/course-projection.module';
import { EventListenerService } from './event-listener.service';

@Module({
  imports: [EnrollmentModule, CourseProjectionModule],
  controllers: [EventListenerService],
})
export class EventListenerModule {}
