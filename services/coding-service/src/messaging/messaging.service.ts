import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CODING_RABBITMQ_CLIENT } from './messaging.constants';

@Injectable()
export class MessagingService implements OnModuleDestroy {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @Inject(CODING_RABBITMQ_CLIENT) private readonly client: ClientProxy,
  ) {}

  publishEvent<T extends object>(routingKey: string, data: T): void {
    const payload = { ...data, timestamp: new Date().toISOString() };
    this.client.emit(routingKey, payload);
    this.logger.debug(`Published event: ${routingKey}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
