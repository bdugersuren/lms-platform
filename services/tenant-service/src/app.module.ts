import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { appConfig, databaseConfig, jwtConfig } from '@lms/shared-config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { TenantModule } from './tenant/tenant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3016),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    TenantModule,
  ],
})
export class AppModule {}
