import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import Joi from 'joi';
import { createAppLogger } from '@lms/shared-utils';
import { appConfig, redisConfig, jwtConfig } from '@lms/shared-config';
import { HealthModule } from './health/health.module';
import { ProxyModule } from './proxy/proxy.module';
import { GatewayAuthModule } from './auth/auth.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, redisConfig, jwtConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),
        AUTH_SERVICE_URL: Joi.string().uri().required(),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        instance: createAppLogger({
          service: config.get<string>('app.serviceName', 'gateway'),
        }),
      }),
    }),

    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 30000,
        maxRedirects: 5,
      }),
    }),

    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            name: 'default',
            ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
            limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
          },
        ],
      }),
    }),

    GatewayAuthModule,
    MediaModule,
    HealthModule,
    ProxyModule,
  ],
})
export class AppModule {}
