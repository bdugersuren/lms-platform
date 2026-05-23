import { Injectable } from '@nestjs/common';
import { AuditActionPayload } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditQueryDto {
  actorId?: string;
  method?: string;
  service?: string;
  path?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(payload: AuditActionPayload): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: payload.actor.userId,
        actorEmail: payload.actor.email,
        actorRole: payload.actor.role,
        method: payload.action.method,
        path: payload.action.path,
        service: payload.action.service,
        statusCode: payload.outcome.statusCode,
        success: payload.outcome.success,
        ip: payload.context.ip,
        userAgent: payload.context.userAgent,
        correlationId: payload.context.correlationId,
        occurredAt: new Date(payload.occurredAt),
      },
    });
  }

  async findAll(query: AuditQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.method ? { method: query.method.toUpperCase() } : {}),
      ...(query.service ? { service: query.service } : {}),
      ...(query.path ? { path: { contains: query.path } } : {}),
      ...((query.from || query.to) ? {
        occurredAt: {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {}),
        },
      } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
