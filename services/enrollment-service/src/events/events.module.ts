import { Module } from '@nestjs/common';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { EventListenerService } from './event-listener.service';

@Module({
  imports: [EnrollmentModule],
  controllers: [EventListenerService],
})
export class EventListenerModule {}
