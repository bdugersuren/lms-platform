import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ANALYTICS_RABBITMQ_CLIENT } from './messaging.constants';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([{
      name: ANALYTICS_RABBITMQ_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: Transport.RMQ,
        options: {
          urls: [config.get<string>('rabbitmq.url', 'amqp://localhost:5672')],
          exchange: config.get<string>('rabbitmq.exchange', 'lms.events'),
          exchangeType: 'topic',
          routingKey: '#',
          queue: 'analytics.publisher',
          queueOptions: { durable: true },
          noAck: true,
        },
      }),
    }]),
  ],
  exports: [ClientsModule],
})
export class MessagingModule {}
