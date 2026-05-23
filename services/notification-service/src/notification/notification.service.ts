import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto, UpdatePreferencesDto } from './dto/query-notification.dto';

export interface SendOptions {
  userId: string;
  type?: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  emailAddress?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ─── Core send ────────────────────────────────────────────────────────────

  async send(opts: SendOptions): Promise<void> {
    const prefs = await this.getOrCreatePreferences(opts.userId);

    // In-app: synchronous delivery — always SENT
    if (prefs.inApp) {
      await this.prisma.notification.create({
        data: {
          userId: opts.userId,
          type: opts.type ?? NotificationType.INFO,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
          title: opts.title,
          body: opts.body,
          metadata: opts.metadata as object ?? undefined,
          lastAttemptAt: new Date(),
        },
      });
    }

    // Email: create PENDING, then update based on delivery result
    if (prefs.email && opts.emailAddress) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: opts.userId,
          type: opts.type ?? NotificationType.INFO,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.PENDING,
          title: opts.title,
          body: opts.body,
          metadata: opts.metadata as object ?? undefined,
        },
      });

      const result = await this.email.send({
        to: opts.emailAddress,
        subject: opts.title,
        html: this.email.buildNotificationHtml(opts.title, opts.body),
      });

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: result.success
          ? { status: NotificationStatus.SENT, providerMessageId: result.providerMessageId, lastAttemptAt: new Date() }
          : { status: NotificationStatus.FAILED, failureReason: result.failureReason, retryCount: { increment: 1 }, lastAttemptAt: new Date() },
      });

      if (!result.success) {
        this.logger.warn(`Email delivery failed for user ${opts.userId}: ${result.failureReason}`);
      }
    }
  }

  // ─── Retry failed notifications (called by RetryService) ─────────────────

  async retryFailed(): Promise<number> {
    const MAX_RETRY = 3;
    const failed = await this.prisma.notification.findMany({
      where: { status: NotificationStatus.FAILED, retryCount: { lt: MAX_RETRY } },
      take: 50,
    });

    let retried = 0;
    for (const notif of failed) {
      if (notif.channel === NotificationChannel.EMAIL && notif.metadata) {
        const emailAddress = (notif.metadata as Record<string, unknown>)['emailAddress'] as string | undefined;
        if (!emailAddress) continue;

        const result = await this.email.send({
          to: emailAddress,
          subject: notif.title,
          html: this.email.buildNotificationHtml(notif.title, notif.body),
        });

        await this.prisma.notification.update({
          where: { id: notif.id },
          data: result.success
            ? { status: NotificationStatus.SENT, providerMessageId: result.providerMessageId, lastAttemptAt: new Date() }
            : { status: NotificationStatus.FAILED, failureReason: result.failureReason, retryCount: { increment: 1 }, lastAttemptAt: new Date() },
        });
        retried++;
      }
    }
    return retried;
  }

  // ─── Admin / internal create ──────────────────────────────────────────────

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type ?? NotificationType.INFO,
        channel: dto.channel ?? NotificationChannel.IN_APP,
        title: dto.title,
        body: dto.body,
        metadata: dto.metadata as object ?? undefined,
      },
    });
  }

  // ─── User queries ─────────────────────────────────────────────────────────

  async findAll(userId: string, query: QueryNotificationDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: {
          userId,
          channel: NotificationChannel.IN_APP,
          ...(query.unreadOnly ? { isRead: false } : {}),
          ...(query.type ? { type: query.type } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({
        where: {
          userId,
          channel: NotificationChannel.IN_APP,
          ...(query.unreadOnly ? { isRead: false } : {}),
        },
      }),
      this.prisma.notification.count({
        where: { userId, channel: NotificationChannel.IN_APP, isRead: false },
      }),
    ]);

    return { items, total, unreadCount, limit, offset };
  }

  async markRead(userId: string, id: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notif) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, isRead: false, channel: NotificationChannel.IN_APP },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: count };
  }

  async remove(userId: string, id: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notif) throw new NotFoundException('Notification not found');
    await this.prisma.notification.delete({ where: { id } });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false, channel: NotificationChannel.IN_APP },
    });
    return { count };
  }

  // ─── Preferences ──────────────────────────────────────────────────────────

  async getOrCreatePreferences(userId: string) {
    const existing = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.notificationPreference.create({ data: { userId } });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }
}
