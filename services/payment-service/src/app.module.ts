import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { appConfig, databaseConfig, jwtConfig, rabbitmqConfig } from '@lms/shared-config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';
import { WebhookModule } from './webhook/webhook.module';
import { EventFailureModule } from './event-failure/event-failure.module';
import { OutboxModule } from './outbox/outbox.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, rabbitmqConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3008),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        RABBITMQ_URL: Joi.string().required(),
        RABBITMQ_EXCHANGE: Joi.string().default('lms.events'),
        // QPay credentials (optional — falls back to mock mode)
        QPAY_BASE_URL: Joi.string().optional(),
        QPAY_USERNAME: Joi.string().optional().allow(''),
        QPAY_PASSWORD: Joi.string().optional().allow(''),
        QPAY_CALLBACK_URL: Joi.string().optional(),
        // SocialPay credentials (optional — falls back to mock mode)
        SOCIALPAY_BASE_URL: Joi.string().optional(),
        SOCIALPAY_TERMINAL_ID: Joi.string().optional().allow(''),
        SOCIALPAY_SECRET_KEY: Joi.string().optional().allow(''),
        SOCIALPAY_CALLBACK_URL: Joi.string().optional(),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    PrismaModule,
    MessagingModule,
    HealthModule,
    AuthModule,
    PaymentModule,
    WebhookModule,
    EventFailureModule,
    OutboxModule,
  ],
})
export class AppModule {}
