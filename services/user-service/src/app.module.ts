import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { appConfig, databaseConfig, jwtConfig, rabbitmqConfig } from '@lms/shared-config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { UserModule } from './user/user.module';
import { EventListenerModule } from './events/event-listener.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, rabbitmqConfig],
      validationSchema: Joi.object({
        PORT:              Joi.number().default(3014),
        NODE_ENV:          Joi.string().valid('development', 'production', 'test').default('development'),
        DATABASE_URL:      Joi.string().required(),
        JWT_SECRET:        Joi.string().min(32).required(),
        RABBITMQ_URL:      Joi.string().required(),
        RABBITMQ_EXCHANGE: Joi.string().default('lms.events'),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    PrismaModule,
    MessagingModule,
    AuthModule,
    HealthModule,
    UserModule,
    EventListenerModule,
  ],
})
export class AppModule {}
