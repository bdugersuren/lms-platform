import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { COURSE_RABBITMQ_CLIENT } from './messaging.constants';

@Injectable()
export class MessagingService implements OnModuleDestroy {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @Inject(COURSE_RABBITMQ_CLIENT) private readonly client: ClientProxy,
  ) {}

  async publishEvent<T extends object>(routingKey: string, data: T): Promise<void> {
    const payload = { ...data, timestamp: new Date().toISOString() };
    await lastValueFrom(this.client.emit(routingKey, payload));
    this.logger.debug(`Published event: ${routingKey}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
