import { Injectable, Logger } from '@nestjs/common';
import { CourseClientService } from '../course-client/course-client.service';
import { CourseProjectionService } from './course-projection.service';
import { PrismaService } from '../prisma/prisma.service';

export interface RebuildResult {
  total: number;
  rebuilt: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

@Injectable()
export class ProjectionRebuildService {
  private readonly logger = new Logger(ProjectionRebuildService.name);
  private rebuilding = false;

  constructor(
    private readonly courseClient: CourseClientService,
    private readonly courseProjection: CourseProjectionService,
    private readonly prisma: PrismaService,
  ) {}

  async rebuildAll(): Promise<RebuildResult> {
    if (this.rebuilding) {
      this.logger.warn('Projection rebuild already in progress — skipping');
      return { total: 0, rebuilt: 0, skipped: 0, errors: 0, durationMs: 0 };
    }

    this.rebuilding = true;
    const startMs = Date.now();
    let rebuilt = 0;
    let errors = 0;
    let skipped = 0;
    let total = 0;

    try {
      // Page through all published courses
      let page = 1;
      const limit = 50;

      while (true) {
        const { ids, total: pageTotal } = await this.courseClient.listPublishedCourseIds(page, limit);
        if (page === 1) total = pageTotal;
        if (ids.length === 0) break;

        for (const courseId of ids) {
          try {
            const course = await this.courseClient.getCourse(courseId);
            await this.courseProjection.rebuildFromCourseData(course);
            rebuilt++;
          } catch (err) {
            errors++;
            this.logger.error(`Projection rebuild failed for courseId=${courseId}`, (err as Error).message);
          }
        }

        if (ids.length < limit) break;
        page++;
      }

      const durationMs = Date.now() - startMs;
      this.logger.log(
        `Projection rebuild complete: rebuilt=${rebuilt} errors=${errors} total=${total} duration=${durationMs}ms`,
      );
      return { total, rebuilt, skipped, errors, durationMs };
    } finally {
      this.rebuilding = false;
    }
  }

  async getProjectionStats(): Promise<{
    courses: number;
    modules: number;
    lessons: number;
    deletedLessons: number;
  }> {
    const [courses, modules, lessons, deletedLessons] = await Promise.all([
      this.prisma.courseProjection.count(),
      this.prisma.moduleProjection.count(),
      this.prisma.lessonProjection.count({ where: { deletedAt: null } }),
      this.prisma.lessonProjection.count({ where: { deletedAt: { not: null } } }),
    ]);
    return { courses, modules, lessons, deletedLessons };
  }
}
