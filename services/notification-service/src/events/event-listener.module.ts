import { Module } from '@nestjs/common';
import { EventListenerService } from './event-listener.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [EventListenerService],
})
export class EventListenerModule {}
