import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { EventListenerService } from './event-listener.service';

@Module({
  imports: [UserModule],
  providers: [EventListenerService],
})
export class EventListenerModule {}
