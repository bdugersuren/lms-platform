import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RevenueModule } from '../revenue/revenue.module';
import { EventListenerService } from './event-listener.service';

@Module({
  imports: [HttpModule.register({ timeout: 5000 }), RevenueModule],
  controllers: [EventListenerService],
})
export class EventListenerModule {}
