import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { appConfig, databaseConfig, jwtConfig, rabbitmqConfig, redisConfig } from '@lms/shared-config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { MessagingModule } from './messaging/messaging.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, rabbitmqConfig, redisConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3001),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        REDIS_HOST: Joi.string().default('redis'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().allow('').optional(),
        RABBITMQ_URL: Joi.string().required(),
        RABBITMQ_EXCHANGE: Joi.string().default('lms.events'),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    PrismaModule,
    RedisModule,
    MessagingModule,
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
