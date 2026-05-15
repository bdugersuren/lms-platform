import { Module } from '@nestjs/common';
import { EventListenerService } from './event-listener.service';

@Module({ providers: [EventListenerService] })
export class EventListenerModule {}
