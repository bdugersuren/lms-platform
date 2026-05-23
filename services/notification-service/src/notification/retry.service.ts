import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from './notification.service';

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  constructor(private readonly notifications: NotificationService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailed(): Promise<void> {
    const count = await this.notifications.retryFailed();
    if (count > 0) {
      this.logger.log(`Retried ${count} failed notification(s)`);
    }
  }
}
