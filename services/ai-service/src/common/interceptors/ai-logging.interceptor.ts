import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

const PATH_TO_SERVICE: Record<string, string> = {
  '/ai/tutor/sessions': 'TUTOR',
  '/api/ai/tutor/sessions': 'TUTOR',
  '/ai/essay-score': 'ESSAY_SCORE',
  '/api/ai/essay-score': 'ESSAY_SCORE',
  '/ai/recommendations': 'RECOMMENDATION',
  '/api/ai/recommendations': 'RECOMMENDATION',
};

function resolveService(path: string): string | null {
  for (const [prefix, service] of Object.entries(PATH_TO_SERVICE)) {
    if (path.startsWith(prefix)) return service;
  }
  return null;
}

@Injectable()
export class AiLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AiLoggingInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ url?: string; user?: { sub?: string } }>();
    const userId = req.user?.sub;
    const service = resolveService(req.url ?? '');

    if (!userId || !service) return next.handle();

    const startMs = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startMs;
          this.prisma.aiInteractionLog
            .create({ data: { userId, service, durationMs, success: true } })
            .catch((err: unknown) => this.logger.error('Failed to write AI log', err));
        },
        error: (err: unknown) => {
          const durationMs = Date.now() - startMs;
          const errorMsg = err instanceof Error ? err.message : String(err);
          this.prisma.aiInteractionLog
            .create({ data: { userId, service, durationMs, success: false, errorMsg } })
            .catch((logErr: unknown) => this.logger.error('Failed to write AI log', logErr));
        },
      }),
    );
  }
}
