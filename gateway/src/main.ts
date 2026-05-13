import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { createAppLogger } from '@lms/shared-utils';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const logger = createAppLogger({ service: 'gateway' });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, bodyLimit: 500 * 1024 * 1024 }),
    {
      logger: WinstonModule.createLogger({ instance: logger }),
    },
  );

  await app.register(require('@fastify/multipart'), {
    limits: { fileSize: 500 * 1024 * 1024, files: 1 }, // 500 MB
  });

  app.enableCors({
    origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
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

  app.useGlobalFilters(new HttpExceptionFilter());

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('LMS Platform API')
      .setDescription('Enterprise-grade AI-native LMS — API Gateway')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    logger.info('Swagger docs available at /docs');
  }

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');

  logger.info(`Gateway listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Gateway failed to start', err);
  process.exit(1);
});
