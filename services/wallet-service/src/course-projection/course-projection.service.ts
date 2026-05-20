import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CourseContentEventEnvelope,
  CourseSnapshotPayload,
} from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseProjectionService {
  private readonly logger = new Logger(CourseProjectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleCourseEvent(envelope: CourseContentEventEnvelope): Promise<void> {
    const payload = envelope.payload as CourseSnapshotPayload;
    if (!payload?.course?.courseId) {
      this.logger.warn(`Ignoring malformed course event: ${envelope.eventType}`);
      return;
    }
    const { course } = payload;
    await this.prisma.courseProjection.upsert({
      where: { courseId: course.courseId },
      create: {
        courseId: course.courseId,
        title: course.title,
        instructorId: course.instructorId,
        price: new Prisma.Decimal(course.price ?? '0'),
        status: course.status,
        contentVersion: course.contentVersion,
        publishedAt: course.publishedAt ? new Date(course.publishedAt) : null,
      },
      update: {
        title: course.title,
        instructorId: course.instructorId,
        price: new Prisma.Decimal(course.price ?? '0'),
        status: course.status,
        contentVersion: course.contentVersion,
        publishedAt: course.publishedAt ? new Date(course.publishedAt) : null,
      },
    });
    this.logger.debug(`CourseProjection upserted: courseId=${course.courseId}`);
  }

  async findCourse(courseId: string) {
    return this.prisma.courseProjection.findUnique({ where: { courseId } });
  }
}
