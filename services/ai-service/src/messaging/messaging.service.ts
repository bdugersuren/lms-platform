import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AI_RABBITMQ_CLIENT } from './messaging.constants';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(@Inject(AI_RABBITMQ_CLIENT) private readonly client: ClientProxy) {}

  emit(pattern: string, data: unknown): void {
    this.client.emit(pattern, data).subscribe({
      error: (err: unknown) => this.logger.error(`Failed to emit ${pattern}`, err),
    });
  }
}
