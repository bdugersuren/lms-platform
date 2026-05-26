import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { appConfig, databaseConfig, jwtConfig, rabbitmqConfig } from '@lms/shared-config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { OutboxModule } from './outbox/outbox.module';
import { DmojModule } from './dmoj/dmoj.module';
import { CodingModule } from './coding/coding.module';
import { SubmissionModule } from './submission/submission.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, rabbitmqConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3017),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        RABBITMQ_URL: Joi.string().required(),
        RABBITMQ_EXCHANGE: Joi.string().default('lms.events'),
        DMOJ_BASE_URL: Joi.string().uri().required(),
        DMOJ_INTERNAL_SECRET: Joi.string().required(),
        DMOJ_RESULT_SYNC_INTERVAL_MS: Joi.number().default(5000),
        ASSIGNMENT_SERVICE_URL: Joi.string().uri().required(),
        ENROLLMENT_SERVICE_URL: Joi.string().uri().required(),
        CODING_SERVICE_ACCOUNT_EMAIL: Joi.string().email().required(),
        CODING_SERVICE_ACCOUNT_PASSWORD: Joi.string().required(),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    PrismaModule,
    MessagingModule,
    HealthModule,
    AuthModule,
    OutboxModule,
    DmojModule,
    CodingModule,
    SubmissionModule,
  ],
})
export class AppModule {}
