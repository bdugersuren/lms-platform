import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { appConfig, databaseConfig, jwtConfig, rabbitmqConfig } from '@lms/shared-config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { QuizModule } from './quiz/quiz.module';
import { QuestionModule } from './question/question.module';
import { AttemptModule } from './attempt/attempt.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, rabbitmqConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3005),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        RABBITMQ_URL: Joi.string().required(),
        RABBITMQ_EXCHANGE: Joi.string().default('lms.events'),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    PrismaModule,
    MessagingModule,
    HealthModule,
    AuthModule,
    QuizModule,
    QuestionModule,
    AttemptModule,
  ],
})
export class AppModule {}
