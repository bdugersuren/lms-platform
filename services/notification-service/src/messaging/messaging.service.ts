import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { NOTIFICATION_RABBITMQ_CLIENT } from './messaging.constants';

@Injectable()
export class MessagingService implements OnModuleDestroy {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @Inject(NOTIFICATION_RABBITMQ_CLIENT) private readonly client: ClientProxy,
  ) {}

  emit(routingKey: string, data: unknown): void {
    this.client.emit(routingKey, { ...((data as object) ?? {}), timestamp: new Date().toISOString() });
    this.logger.debug(`Emitted: ${routingKey}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
