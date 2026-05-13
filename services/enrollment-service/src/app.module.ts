import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import Joi from 'joi';
import { appConfig, databaseConfig, jwtConfig, rabbitmqConfig } from '@lms/shared-config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CourseClientModule } from './course-client/course-client.module';
import { EnrollmentModule } from './enrollment/enrollment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, rabbitmqConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3004),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        RABBITMQ_URL: Joi.string().required(),
        RABBITMQ_EXCHANGE: Joi.string().default('lms.events'),
        COURSE_SERVICE_URL: Joi.string().default('http://course-service:3003'),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    HttpModule.register({ timeout: 5000 }),

    PrismaModule,
    MessagingModule,
    HealthModule,
    AuthModule,
    CourseClientModule,
    EnrollmentModule,
  ],
})
export class AppModule {}
