import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface RabbitMQConfig {
  url: string;
  exchange: string;
  prefetchCount: number;
}

export const rabbitmqConfigValidationSchema = Joi.object({
  RABBITMQ_URL: Joi.string().required(),
  RABBITMQ_EXCHANGE: Joi.string().default('lms.events'),
  RABBITMQ_PREFETCH_COUNT: Joi.number().default(10),
});

export const rabbitmqConfig = registerAs(
  'rabbitmq',
  (): RabbitMQConfig => ({
    url: process.env.RABBITMQ_URL as string,
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'lms.events',
    prefetchCount: parseInt(process.env.RABBITMQ_PREFETCH_COUNT ?? '10', 10),
  }),
);
