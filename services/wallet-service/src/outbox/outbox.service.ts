import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventEnvelope } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class OutboxService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OutboxService.name);
  private timer?: NodeJS.Timeout;
  private publishing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  async enqueue<TPayload>(
    tx: Prisma.TransactionClient,
    envelope: EventEnvelope<TPayload>,
  ): Promise<void> {
    await tx.eventOutbox.create({
      data: {
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        aggregateType: envelope.aggregateType,
        aggregateId: envelope.aggregateId,
        payload: envelope as unknown as Prisma.InputJsonValue,
        occurredAt: new Date(envelope.occurredAt),
      },
    });
  }

  async publishPending(limit = 50): Promise<void> {
    if (this.publishing) return;
    this.publishing = true;

    try {
      const pending = await this.prisma.eventOutbox.findMany({
        where: { publishedAt: null },
        orderBy: { occurredAt: 'asc' },
        take: limit,
      });

      for (const event of pending) {
        try {
          await this.messaging.publishEvent(event.eventType, event.payload as object);
          await this.prisma.eventOutbox.update({
            where: { id: event.id },
            data: {
              publishedAt: new Date(),
              attempts: { increment: 1 },
              lastError: null,
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to publish outbox event ${event.eventId}`, err);
          await this.prisma.eventOutbox.update({
            where: { id: event.id },
            data: {
              attempts: { increment: 1 },
              lastError: message,
            },
          });
        }
      }
    } finally {
      this.publishing = false;
    }
  }

  async replayEvent(id: string): Promise<void> {
    const event = await this.prisma.eventOutbox.findUniqueOrThrow({ where: { id } });
    await this.messaging.publishEvent(event.eventType, event.payload as object);
    await this.prisma.eventOutbox.update({
      where: { id },
      data: { publishedAt: new Date(), attempts: { increment: 1 }, lastError: null },
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.publishPending();
    const intervalMs = Number(process.env.WALLET_OUTBOX_POLL_MS ?? 5000);
    this.timer = setInterval(() => {
      void this.publishPending();
    }, intervalMs);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
