import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';

export const AI_RATE_LIMIT_KEY = 'ai_rate_limit';

export interface AiRateLimit {
  service: string;
  limit: number;
  windowSeconds: number;
}

export const AI_RATE_LIMITS: Record<string, AiRateLimit> = {
  TUTOR:          { service: 'TUTOR',          limit: 30, windowSeconds: 3600 },
  ESSAY_SCORE:    { service: 'ESSAY_SCORE',    limit: 5,  windowSeconds: 3600 },
  RECOMMENDATION: { service: 'RECOMMENDATION', limit: 10, windowSeconds: 86400 },
};

let redisClient: Redis | null = null;

function getRedisClient(config: ConfigService): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.get<string>('REDIS_HOST', 'redis'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
    });
  }
  return redisClient;
}

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimit = this.reflector.get<AiRateLimit>(AI_RATE_LIMIT_KEY, context.getHandler());
    if (!rateLimit) return true;

    const request = context.switchToHttp().getRequest<{ user?: { sub?: string } }>();
    const userId = request.user?.sub;
    if (!userId) return true;

    const redis = getRedisClient(this.config);
    const key = `ai:rl:${rateLimit.service}:${userId}`;

    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, rateLimit.windowSeconds);
      }
      if (count > rateLimit.limit) {
        const ttl = await redis.ttl(key);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Rate limit exceeded for ${rateLimit.service}. Try again in ${ttl}s.`,
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // Redis failure — fail open (don't block the request)
    }

    return true;
  }
}
