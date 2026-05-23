import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { RetryService } from './retry.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, RetryService],
  exports: [NotificationService],
})
export class NotificationModule {}
