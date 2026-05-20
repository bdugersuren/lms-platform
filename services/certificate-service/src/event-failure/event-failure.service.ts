import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventFailureService {
  constructor(private readonly prisma: PrismaService) {}

  async record(opts: {
    eventType: string;
    consumer: string;
    payload: unknown;
    error: unknown;
    eventId?: string;
  }): Promise<void> {
    const err = opts.error instanceof Error ? opts.error : new Error(String(opts.error));
    await this.prisma.eventFailure.create({
      data: {
        eventId: opts.eventId,
        eventType: opts.eventType,
        consumer: opts.consumer,
        payload: opts.payload as Prisma.InputJsonValue,
        errorMsg: err.message,
        stackTrace: err.stack,
      },
    });
  }

  async listUnresolved(page = 1, limit = 20) {
    return this.prisma.eventFailure.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async markResolved(id: string) {
    return this.prisma.eventFailure.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });
  }
}
