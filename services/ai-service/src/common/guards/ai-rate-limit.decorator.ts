import { SetMetadata } from '@nestjs/common';
import { AI_RATE_LIMIT_KEY, AI_RATE_LIMITS, AiRateLimit } from './ai-rate-limit.guard';

export const AiRateLimit = (service: keyof typeof AI_RATE_LIMITS): MethodDecorator =>
  SetMetadata<string, AiRateLimit>(AI_RATE_LIMIT_KEY, AI_RATE_LIMITS[service]);
