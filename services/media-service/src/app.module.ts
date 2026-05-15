import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { appConfig, databaseConfig, jwtConfig, rabbitmqConfig } from '@lms/shared-config';
import { PrismaModule } from './prisma/prisma.module';
import { MinioModule } from './minio/minio.module';
import { MessagingModule } from './messaging/messaging.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { MediaModule } from './media/media.module';
import { TranscodeModule } from './transcode/transcode.module';
import { SubtitleModule } from './subtitle/subtitle.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, rabbitmqConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3011),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        RABBITMQ_URL: Joi.string().required(),
        RABBITMQ_EXCHANGE: Joi.string().default('lms.events'),
        MINIO_ENDPOINT: Joi.string().default('minio'),
        MINIO_PORT: Joi.number().default(9000),
        MINIO_USE_SSL: Joi.string().default('false'),
        MINIO_ACCESS_KEY: Joi.string().required(),
        MINIO_SECRET_KEY: Joi.string().required(),
        MINIO_BUCKET: Joi.string().default('lms-media'),
        MINIO_PUBLIC_URL: Joi.string().default('http://localhost:9000'),
        UPLOAD_MAX_SIZE_MB: Joi.number().default(500),
        PRESIGN_EXPIRES_SECONDS: Joi.number().default(7200),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    PrismaModule,
    MinioModule,
    MessagingModule,
    HealthModule,
    AuthModule,
    MediaModule,
    TranscodeModule,
    SubtitleModule,
  ],
})
export class AppModule {}
