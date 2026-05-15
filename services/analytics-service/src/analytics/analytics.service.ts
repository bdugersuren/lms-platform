import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TRACKED_EVENTS } from '../messaging/messaging.constants';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Overview KPIs ──────────────────────────────────────────────────────────

  async getOverview() {
    const countByType = async (eventType: string) =>
      this.prisma.analyticsEvent.count({ where: { eventType } });

    const [
      totalUsers,
      totalEnrollments,
      completedCourses,
      confirmedPayments,
      failedPayments,
      quizAttempts,
      assignmentSubmissions,
      certificatesIssued,
      mediaUploads,
    ] = await Promise.all([
      countByType(TRACKED_EVENTS.USER_REGISTERED),
      countByType(TRACKED_EVENTS.ENROLLMENT_CREATED),
      countByType(TRACKED_EVENTS.ENROLLMENT_COMPLETED),
      countByType(TRACKED_EVENTS.PAYMENT_CONFIRMED),
      countByType(TRACKED_EVENTS.PAYMENT_FAILED),
      countByType(TRACKED_EVENTS.QUIZ_COMPLETED),
      countByType(TRACKED_EVENTS.ASSIGNMENT_GRADED),
      countByType(TRACKED_EVENTS.CERTIFICATE_ISSUED),
      countByType(TRACKED_EVENTS.MEDIA_UPLOADED),
    ]);

    // Sum revenue from payment confirmed events
    const payments = await this.prisma.analyticsEvent.findMany({
      where: { eventType: TRACKED_EVENTS.PAYMENT_CONFIRMED },
      select: { payload: true },
    });
    const totalRevenue = payments.reduce((sum, e) => {
      const p = e.payload as Record<string, unknown> | null;
      const amount = typeof p?.['amount'] === 'number' ? p['amount'] : 0;
      return sum + amount;
    }, 0);

    // Avg quiz score
    const quizEvents = await this.prisma.analyticsEvent.findMany({
      where: { eventType: TRACKED_EVENTS.QUIZ_COMPLETED },
      select: { payload: true },
    });
    const scores = quizEvents
      .map(e => {
        const p = e.payload as Record<string, unknown> | null;
        return typeof p?.['score'] === 'number' ? p['score'] : null;
      })
      .filter((s): s is number => s !== null);
    const avgQuizScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    return {
      totalUsers,
      totalEnrollments,
      completedCourses,
      confirmedPayments,
      failedPayments,
      quizAttempts,
      assignmentSubmissions,
      certificatesIssued,
      mediaUploads,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgQuizScore: avgQuizScore !== null ? Math.round(avgQuizScore * 10) / 10 : null,
      completionRate: totalEnrollments > 0
        ? Math.round((completedCourses / totalEnrollments) * 1000) / 10
        : 0,
    };
  }

  // ── Daily time-series (last N days) ───────────────────────────────────────

  async getTimeSeries(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await this.prisma.analyticsEvent.findMany({
      where: { occurredAt: { gte: since } },
      select: { eventType: true, occurredAt: true, payload: true },
      orderBy: { occurredAt: 'asc' },
    });

    // Build a map: date → counts
    const map = new Map<string, {
      date: string;
      newUsers: number;
      newEnrollments: number;
      completedCourses: number;
      revenue: number;
      quizAttempts: number;
      certificates: number;
    }>();

    const dateKey = (d: Date) => d.toISOString().slice(0, 10);

    // Pre-populate all days
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      map.set(key, { date: key, newUsers: 0, newEnrollments: 0, completedCourses: 0, revenue: 0, quizAttempts: 0, certificates: 0 });
    }

    for (const e of events) {
      const key = dateKey(new Date(e.occurredAt));
      const entry = map.get(key);
      if (!entry) continue;
      const p = e.payload as Record<string, unknown> | null;

      switch (e.eventType) {
        case TRACKED_EVENTS.USER_REGISTERED:   entry.newUsers++;       break;
        case TRACKED_EVENTS.ENROLLMENT_CREATED: entry.newEnrollments++; break;
        case TRACKED_EVENTS.ENROLLMENT_COMPLETED: entry.completedCourses++; break;
        case TRACKED_EVENTS.PAYMENT_CONFIRMED:
          entry.revenue += typeof p?.['amount'] === 'number' ? p['amount'] : 0;
          break;
        case TRACKED_EVENTS.QUIZ_COMPLETED:    entry.quizAttempts++;   break;
        case TRACKED_EVENTS.CERTIFICATE_ISSUED: entry.certificates++;  break;
      }
    }

    return Array.from(map.values());
  }

  // ── Recent events feed ─────────────────────────────────────────────────────

  async getRecentEvents(limit = 50, offset = 0, eventType?: string) {
    const where = eventType ? { eventType } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.analyticsEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: limit,
        skip: offset,
        select: { id: true, eventType: true, userId: true, courseId: true, occurredAt: true },
      }),
      this.prisma.analyticsEvent.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  // ── Top-course stats (enrollments per courseId from events) ───────────────

  async getCourseStats(limit = 10) {
    const result = await this.prisma.$queryRaw<{ courseId: string; count: bigint }[]>`
      SELECT "courseId", COUNT(*) as count
      FROM "AnalyticsEvent"
      WHERE "courseId" IS NOT NULL
        AND "eventType" = ${TRACKED_EVENTS.ENROLLMENT_CREATED}
      GROUP BY "courseId"
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    return result.map(r => ({ courseId: r.courseId, enrollments: Number(r.count) }));
  }

  // ── User activity (unique active users per day over last N days) ──────────

  async getUserActivity(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const result = await this.prisma.$queryRaw<{ date: string; active_users: bigint }[]>`
      SELECT DATE("occurredAt") as date, COUNT(DISTINCT "userId") as active_users
      FROM "AnalyticsEvent"
      WHERE "occurredAt" >= ${since} AND "userId" IS NOT NULL
      GROUP BY DATE("occurredAt")
      ORDER BY date ASC
    `;
    return result.map(r => ({ date: String(r.date).slice(0, 10), activeUsers: Number(r.active_users) }));
  }

  // ── Event type breakdown ───────────────────────────────────────────────────

  async getEventBreakdown() {
    const result = await this.prisma.$queryRaw<{ eventType: string; count: bigint }[]>`
      SELECT "eventType", COUNT(*) as count
      FROM "AnalyticsEvent"
      GROUP BY "eventType"
      ORDER BY count DESC
    `;
    return result.map(r => ({ eventType: r.eventType, count: Number(r.count) }));
  }
}
