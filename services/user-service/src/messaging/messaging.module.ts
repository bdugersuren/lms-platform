import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MessagingService } from './messaging.service';
import { USER_RABBITMQ_CLIENT } from './messaging.constants';

export { USER_RABBITMQ_CLIENT };

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: USER_RABBITMQ_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('rabbitmq.url', 'amqp://localhost:5672')],
            exchange: config.get<string>('rabbitmq.exchange', 'lms.events'),
            exchangeType: 'topic',
            routingKey: '#',
            queue: 'user.publisher',
            queueOptions: { durable: true },
            noAck: true,
          },
        }),
      },
    ]),
  ],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
