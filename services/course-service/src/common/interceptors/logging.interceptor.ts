import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const correlationId = (request.headers['x-correlation-id'] as string) ?? '-';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<{ statusCode: number }>();
          const duration = Date.now() - start;
          this.logger.log(`${method} ${url} ${response.statusCode} +${duration}ms [${correlationId}]`);
        },
        error: () => {
          const duration = Date.now() - start;
          this.logger.warn(`${method} ${url} ERR +${duration}ms [${correlationId}]`);
        },
      }),
    );
  }
}
