import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface DatabaseConfig {
  url: string;
}

export const databaseConfigValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
});

export const databaseConfig = registerAs(
  'database',
  (): DatabaseConfig => ({
    url: process.env.DATABASE_URL as string,
  }),
);
