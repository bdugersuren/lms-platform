import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationType } from '@prisma/client';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ─── Core send ────────────────────────────────────────────────────────────

  async send(opts: SendOptions): Promise<void> {
    const prefs = await this.getOrCreatePreferences(opts.userId);

    // In-app always (if enabled)
    if (prefs.inApp) {
      await this.prisma.notification.create({
        data: {
          userId: opts.userId,
          type: opts.type ?? NotificationType.INFO,
          channel: NotificationChannel.IN_APP,
          title: opts.title,
          body: opts.body,
          metadata: opts.metadata as object ?? undefined,
        },
      });
    }

    // Email (if enabled and address provided)
    if (prefs.email && opts.emailAddress) {
      await this.email.send({
        to: opts.emailAddress,
        subject: opts.title,
        html: this.email.buildNotificationHtml(opts.title, opts.body),
      });

      await this.prisma.notification.create({
        data: {
          userId: opts.userId,
          type: opts.type ?? NotificationType.INFO,
          channel: NotificationChannel.EMAIL,
          title: opts.title,
          body: opts.body,
          metadata: opts.metadata as object ?? undefined,
        },
      });
    }
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
