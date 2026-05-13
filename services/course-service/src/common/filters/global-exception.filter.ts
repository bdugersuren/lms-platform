import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiErrorResponse } from '@lms/shared-types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.resolveException(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode}: ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${statusCode}: ${message}`);
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string;
    error: string;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse() as string | { message?: string | string[]; error?: string };
      const message =
        typeof res === 'string'
          ? res
          : Array.isArray(res.message)
            ? res.message.join('; ')
            : (res.message ?? exception.message);

      return {
        statusCode,
        message,
        error: typeof res === 'object' ? (res.error ?? exception.name) : exception.name,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.mapPrismaError(exception);
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return { statusCode: HttpStatus.SERVICE_UNAVAILABLE, message: 'Database connection failed', error: 'ServiceUnavailable' };
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'Invalid data provided', error: 'BadRequest' };
    }

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error', error: 'InternalServerError' };
  }

  private mapPrismaError(err: Prisma.PrismaClientKnownRequestError): { statusCode: number; message: string; error: string } {
    switch (err.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `A record with this ${(err.meta?.target as string[] | undefined)?.join(', ') ?? 'field'} already exists`,
          error: 'Conflict',
        };
      case 'P2025':
      case 'P2016':
        return { statusCode: HttpStatus.NOT_FOUND, message: 'Record not found', error: 'NotFound' };
      case 'P2003':
        return { statusCode: HttpStatus.BAD_REQUEST, message: 'Referenced record does not exist', error: 'BadRequest' };
      default:
        return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Database error', error: 'InternalServerError' };
    }
  }
}
