import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { WinstonModule } from 'nest-winston';
import { createAppLogger } from '@lms/shared-utils';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { setupUserSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const logger = createAppLogger({ service: 'user-service' });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger({ instance: logger }),
  });

  // Consume auth.user.registered events for automatic profile bootstrap
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://localhost:5672'],
      exchange: process.env.RABBITMQ_EXCHANGE ?? 'lms.events',
      exchangeType: 'topic',
      routingKey: 'auth.#',
      queue: 'user.events',
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  app.enableCors({
    origin: (process.env.ALLOWED_ORIGINS ?? '*').split(','),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  if (process.env.NODE_ENV !== 'production') {
    setupUserSwagger(app);
    logger.info('Swagger docs at /docs');
  }

  await app.startAllMicroservices();

  const port = parseInt(process.env.PORT ?? '3014', 10);
  await app.listen(port, '0.0.0.0');

  logger.info(`User service listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('User service failed to start', err);
  process.exit(1);
});
