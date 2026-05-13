import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { createAppLogger } from '@lms/shared-utils';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const logger = createAppLogger({ service: 'course-service' });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger({ instance: logger }),
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
      .setTitle('Course Service API')
      .setDescription('Courses, modules, and lessons microservice')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addTag('Courses', 'Course management')
      .addTag('Modules', 'Module management')
      .addTag('Lessons', 'Lesson management')
      .addTag('Interactive Blocks', 'Interactive block management')
      .addTag('Enrollments', 'Course enrollment management')
      .addTag('Progress', 'Lesson and block progress tracking')
      .addTag('Skills', 'Skills management')
      .addTag('Health', 'Health check')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    logger.info('Swagger docs at /docs');
  }

  const port = parseInt(process.env.PORT ?? '3003', 10);
  await app.listen(port, '0.0.0.0');

  logger.info(`Course service listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Course service failed to start', err);
  process.exit(1);
});
