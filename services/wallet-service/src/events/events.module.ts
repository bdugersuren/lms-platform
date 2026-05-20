import { Module } from '@nestjs/common';
import { RevenueModule } from '../revenue/revenue.module';
import { EventListenerService } from './event-listener.service';

@Module({
  imports: [RevenueModule],
  controllers: [EventListenerService],
})
export class EventListenerModule {}
