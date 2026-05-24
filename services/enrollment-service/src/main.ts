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
  const logger = createAppLogger({ service: 'enrollment-service' });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger({ instance: logger }),
  });

  const rabbitmqUrl = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';

  // Consume from payment.publisher — declared by payment-service without DLX; must match.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'payment.publisher',
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  // Consume course-service content events — declared by course-service without DLX; must match.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'course.publisher',
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
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Enrollment Service API')
      .setDescription('Enrollments, progress tracking, completion tracking')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addTag('Enrollments', 'Course enrollment management')
      .addTag('Progress', 'Lesson progress tracking')
      .addTag('Health', 'Health check')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    logger.info('Swagger docs at /docs');
  }

  await app.startAllMicroservices();

  const port = parseInt(process.env.PORT ?? '3004', 10);
  await app.listen(port, '0.0.0.0');

  logger.info(`Enrollment service listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Enrollment service failed to start', err);
  process.exit(1);
});
