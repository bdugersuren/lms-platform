import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(
    req: FastifyRequest['raw'],
    res: FastifyReply['raw'],
    next: () => void,
  ): void {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? uuidv4();

    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    next();
  }
}
