import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  serviceName: string;
}

export const appConfigValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  SERVICE_NAME: Joi.string().default('lms-service'),
});

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    serviceName: process.env.SERVICE_NAME ?? 'lms-service',
  }),
);
