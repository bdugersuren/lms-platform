import { Global, Module } from '@nestjs/common';
import { EventFailureService } from './event-failure.service';

@Global()
@Module({
  providers: [EventFailureService],
  exports: [EventFailureService],
})
export class EventFailureModule {}
