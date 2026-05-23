import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { FastifyRequest } from 'fastify';
import { Observable, tap } from 'rxjs';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Paths that should not be audited (health checks, static assets, docs)
const AUDIT_SKIP_PREFIXES = ['/api/health', '/docs'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private readonly auditServiceUrl: string;

  constructor(private readonly http: HttpService) {
    this.auditServiceUrl = process.env.AUDIT_SERVICE_URL ?? 'http://audit-service:3015';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();

    const method = req.method?.toUpperCase() ?? '';
    if (!WRITE_METHODS.has(method)) return next.handle();

    const path = req.url?.split('?')[0] ?? '';
    if (AUDIT_SKIP_PREFIXES.some(p => path.startsWith(p))) return next.handle();

    const startedAt = Date.now();
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.ip ?? '';
    const userAgent = (req.headers['user-agent'] as string) ?? '';
    const correlationId = (req.headers['x-correlation-id'] as string) ?? '';
    const userId = (req.headers['x-user-id'] as string) ?? '';
    const userEmail = (req.headers['x-user-email'] as string) ?? '';
    const userRole = (req.headers['x-user-role'] as string) ?? '';

    const pathParts = path.replace(/^\/api\//, '').split('/');
    const service = pathParts[0] ?? 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          this.emitAudit({ method, path, service, userId, userEmail, userRole, ip, userAgent, correlationId, statusCode: 200, startedAt });
        },
        error: (err: { status?: number }) => {
          const statusCode = err?.status ?? 500;
          this.emitAudit({ method, path, service, userId, userEmail, userRole, ip, userAgent, correlationId, statusCode, startedAt });
        },
      }),
    );
  }

  private emitAudit(ctx: {
    method: string; path: string; service: string;
    userId: string; userEmail: string; userRole: string;
    ip: string; userAgent: string; correlationId: string;
    statusCode: number; startedAt: number;
  }): void {
    if (!ctx.userId) return; // Skip unauthenticated requests

    const payload = {
      actor: { userId: ctx.userId, email: ctx.userEmail, role: ctx.userRole },
      action: { method: ctx.method, path: ctx.path, service: ctx.service },
      outcome: { statusCode: ctx.statusCode, success: ctx.statusCode < 400 },
      context: { ip: ctx.ip, userAgent: ctx.userAgent, correlationId: ctx.correlationId },
      occurredAt: new Date(ctx.startedAt).toISOString(),
    };

    // Fire-and-forget — do not block the response
    this.http.post(`${this.auditServiceUrl}/api/audit/ingest`, payload).subscribe({
      error: (err: Error) => this.logger.warn(`Audit emit failed: ${err.message}`),
    });
  }
}
