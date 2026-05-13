import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  ttl: number;
}

export const redisConfigValidationSchema = Joi.object({
  REDIS_HOST: Joi.string().default('redis'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_TTL: Joi.number().default(3600),
});

export const redisConfig = registerAs(
  'redis',
  (): RedisConfig => ({
    host: process.env.REDIS_HOST ?? 'redis',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    ttl: parseInt(process.env.REDIS_TTL ?? '3600', 10),
  }),
);
