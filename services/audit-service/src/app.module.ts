import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { appConfig, databaseConfig, jwtConfig } from '@lms/shared-config';
import { PrismaService } from './prisma/prisma.service';
import { AuditService } from './audit/audit.service';
import { AuditController } from './audit/audit.controller';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3015),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    AuthModule,
  ],
  controllers: [AuditController],
  providers: [PrismaService, AuditService],
})
export class AppModule {}
