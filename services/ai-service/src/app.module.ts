import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD, Reflector } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Joi from 'joi';
import { appConfig, databaseConfig, jwtConfig, rabbitmqConfig } from '@lms/shared-config';
import { PrismaModule } from './prisma/prisma.module';
import { OllamaModule } from './ollama/ollama.module';
import { MessagingModule } from './messaging/messaging.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AiTutorModule } from './ai-tutor/ai-tutor.module';
import { EssayScoreModule } from './essay-score/essay-score.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { AiLogsModule } from './ai-logs/ai-logs.module';
import { AiLoggingInterceptor } from './common/interceptors/ai-logging.interceptor';
import { AiRateLimitGuard } from './common/guards/ai-rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, rabbitmqConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3009),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        RABBITMQ_URL: Joi.string().required(),
        RABBITMQ_EXCHANGE: Joi.string().default('lms.events'),
        OLLAMA_BASE_URL: Joi.string().default('http://ollama:11434'),
        OLLAMA_MODEL: Joi.string().default('llama3.2'),
        OLLAMA_TIMEOUT_MS: Joi.number().default(120000),
        REDIS_HOST: Joi.string().default('redis'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().optional().allow(''),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    PrismaModule,
    OllamaModule,
    MessagingModule,
    HealthModule,
    AuthModule,
    AiTutorModule,
    EssayScoreModule,
    RecommendationModule,
    AiLogsModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AiLoggingInterceptor },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector, config: ConfigService) =>
        new AiRateLimitGuard(reflector, config),
      inject: [Reflector, ConfigService],
    },
  ],
})
export class AppModule {}
