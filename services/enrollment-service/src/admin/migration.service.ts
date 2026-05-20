import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ReconcileReport {
  enrollmentServiceCount: number;
  aliasCount: number;
  unmappedInCourseService: number;
  progressMismatches: number;
  completionMismatches: number;
  lastMigrationRun: {
    id: string;
    runType: string;
    status: string;
    migratedRows: number;
    skippedRows: number;
    errorRows: number;
    startedAt: Date;
    completedAt: Date | null;
  } | null;
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listRuns(limit = 20) {
    return this.prisma.migrationRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async getLatestRun(runType: string) {
    return this.prisma.migrationRun.findFirst({
      where: { runType },
      orderBy: { startedAt: 'desc' },
    });
  }

  async reconcileReport(): Promise<ReconcileReport> {
    const [enrollmentServiceCount, aliasCount, lastRun] = await Promise.all([
      this.prisma.enrollment.count(),
      this.prisma.enrollmentAlias.count(),
      this.prisma.migrationRun.findFirst({
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    // Progress mismatches: enrollments that are marked completed in enrollment-service
    // but have 0 lesson progresses (potential sync issue)
    const completedWithNoProgress = await this.prisma.enrollment.count({
      where: {
        completed: true,
        lessonProgresses: { none: {} },
      },
    });

    // Enrollments with less than expected lesson progresses (lesson added after enrollment)
    const progressMismatches = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM enrollments e
      WHERE e.progress_percent > 0
        AND NOT EXISTS (
          SELECT 1 FROM lesson_progresses lp WHERE lp.enrollment_id = e.id
        )
    `;

    return {
      enrollmentServiceCount,
      aliasCount,
      unmappedInCourseService: Math.max(0, enrollmentServiceCount - aliasCount),
      progressMismatches: Number((progressMismatches[0]?.count) ?? 0),
      completionMismatches: completedWithNoProgress,
      lastMigrationRun: lastRun
        ? {
            id: lastRun.id,
            runType: lastRun.runType,
            status: lastRun.status,
            migratedRows: lastRun.migratedRows,
            skippedRows: lastRun.skippedRows,
            errorRows: lastRun.errorRows,
            startedAt: lastRun.startedAt,
            completedAt: lastRun.completedAt,
          }
        : null,
    };
  }

  async getAliasStats() {
    const [totalAliases, totalEnrollments] = await Promise.all([
      this.prisma.enrollmentAlias.count(),
      this.prisma.enrollment.count(),
    ]);
    const recentAliases = await this.prisma.enrollmentAlias.findMany({
      orderBy: { migratedAt: 'desc' },
      take: 10,
    });
    return { totalAliases, totalEnrollments, coverage: totalEnrollments > 0 ? totalAliases / totalEnrollments : 0, recentAliases };
  }
}
