import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { createAppLogger } from '@lms/shared-utils';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const logger = createAppLogger({ service: 'wallet-service' });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger({ instance: logger }),
  });

  const rabbitmqUrl = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';
  const dlqArgs = { 'x-dead-letter-exchange': 'lms.dead-letter', 'x-dead-letter-routing-key': 'dead' };

  // Consume enrollment events for revenue distribution
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'enrollment.publisher',
      queueOptions: { durable: true, arguments: dlqArgs },
      noAck: false,
    },
  });

  // Consume course events for local CourseProjection (eliminates HTTP coupling to course-service)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      exchange: process.env.RABBITMQ_EXCHANGE ?? 'lms.events',
      exchangeType: 'topic',
      routingKey: 'course.#',
      queue: 'wallet.course-events',
      queueOptions: { durable: true, arguments: dlqArgs },
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
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Wallet Service API')
      .setDescription('Wallet, transactions, revenue sharing, payouts — FINANCIAL LOGIC ISOLATED')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addTag('Wallet', 'Wallet management')
      .addTag('Transactions', 'Transaction history')
      .addTag('Revenue', 'Revenue sharing')
      .addTag('Payouts', 'Payout requests')
      .addTag('Health', 'Health check')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    logger.info('Swagger docs at /docs');
  }

  await app.startAllMicroservices();

  const port = parseInt(process.env.PORT ?? '3007', 10);
  await app.listen(port, '0.0.0.0');

  logger.info(`Wallet service listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Wallet service failed to start', err);
  process.exit(1);
});
