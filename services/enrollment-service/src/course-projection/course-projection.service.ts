import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CourseContentEventEnvelope,
  CourseContentEventPatterns,
  CourseContentEventPayload,
  CourseLessonDeletedPayload,
  CourseLessonPayload,
  CourseLessonReorderedPayload,
  CourseProjectionPayload,
  CourseSnapshotPayload,
  LessonProjectionPayload,
  ModuleProjectionPayload,
} from '@lms/shared-types';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseProjectionService {
  private readonly logger = new Logger(CourseProjectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleCourseEvent(envelope: CourseContentEventEnvelope): Promise<void> {
    if (!this.isCourseEventEnvelope(envelope)) {
      this.logger.warn('Ignoring malformed course event');
      return;
    }

    const payload = envelope.payload;
    const contentVersion = payload.contentVersion;
    const courseId = this.getCourseId(payload);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.eventInbox.create({
          data: {
            eventId: envelope.eventId,
            eventType: envelope.eventType,
            aggregateType: envelope.aggregateType,
            aggregateId: envelope.aggregateId,
            contentVersion,
            payloadHash: this.hashPayload(payload),
          },
        });

        const current = await tx.courseProjection.findUnique({
          where: { courseId },
          select: { contentVersion: true },
        });

        if (current && current.contentVersion > contentVersion) {
          await this.markProcessed(tx, envelope.eventId);
          this.logger.debug(
            `Ignored stale ${envelope.eventType} for course=${courseId} version=${contentVersion}`,
          );
          return;
        }

        await this.applyProjection(tx, envelope.eventType, payload);
        await this.markProcessed(tx, envelope.eventId);
      });
    } catch (err) {
      if (this.isDuplicateInboxEvent(err)) {
        this.logger.debug(`Duplicate course event ignored: ${envelope.eventId}`);
        return;
      }
      throw err;
    }
  }

  private async applyProjection(
    tx: Prisma.TransactionClient,
    eventType: string,
    payload: CourseContentEventPayload,
  ): Promise<void> {
    switch (eventType) {
      case CourseContentEventPatterns.PUBLISHED:
      case CourseContentEventPatterns.UPDATED:
      case CourseContentEventPatterns.LESSON_REORDERED:
        await this.applySnapshot(tx, payload as CourseSnapshotPayload);
        return;
      case CourseContentEventPatterns.LESSON_CREATED:
      case CourseContentEventPatterns.LESSON_UPDATED:
        await this.applyLesson(tx, payload as CourseLessonPayload);
        return;
      case CourseContentEventPatterns.LESSON_DELETED:
        await this.applyLessonDeleted(tx, payload as CourseLessonDeletedPayload);
        return;
      default:
        this.logger.warn(`Unsupported course event type: ${eventType}`);
    }
  }

  private async applySnapshot(
    tx: Prisma.TransactionClient,
    payload: CourseSnapshotPayload | CourseLessonReorderedPayload,
  ): Promise<void> {
    await this.upsertCourse(tx, payload.course);

    for (const module of payload.modules) {
      await this.upsertModule(tx, module);
    }

    for (const lesson of payload.lessons) {
      await this.upsertLesson(tx, lesson);
    }
  }

  private async applyLesson(
    tx: Prisma.TransactionClient,
    payload: CourseLessonPayload,
  ): Promise<void> {
    await this.upsertCourse(tx, payload.course);
    await this.upsertModule(tx, payload.module);
    await this.upsertLesson(tx, payload.lesson);
  }

  private async applyLessonDeleted(
    tx: Prisma.TransactionClient,
    payload: CourseLessonDeletedPayload,
  ): Promise<void> {
    await this.upsertCourse(tx, payload.course);
    await this.upsertModule(tx, payload.module);
    await this.upsertLesson(tx, {
      ...payload.lesson,
      deletedAt: payload.deletedAt,
    });
  }

  private async upsertCourse(
    tx: Prisma.TransactionClient,
    course: CourseProjectionPayload,
  ): Promise<void> {
    await tx.courseProjection.upsert({
      where: { courseId: course.courseId },
      create: {
        courseId: course.courseId,
        title: course.title,
        slug: course.slug,
        instructorId: course.instructorId,
        price: new Prisma.Decimal(course.price),
        status: course.status,
        isSequential: course.isSequential,
        totalLessons: course.totalLessons,
        totalMinutes: course.totalMinutes,
        contentVersion: course.contentVersion,
        publishedAt: this.toDate(course.publishedAt),
      },
      update: {
        title: course.title,
        slug: course.slug,
        instructorId: course.instructorId,
        price: new Prisma.Decimal(course.price),
        status: course.status,
        isSequential: course.isSequential,
        totalLessons: course.totalLessons,
        totalMinutes: course.totalMinutes,
        contentVersion: course.contentVersion,
        publishedAt: this.toDate(course.publishedAt),
        deletedAt: null,
      },
    });
  }

  private async upsertModule(
    tx: Prisma.TransactionClient,
    module: ModuleProjectionPayload,
  ): Promise<void> {
    await tx.moduleProjection.upsert({
      where: { moduleId: module.moduleId },
      create: {
        moduleId: module.moduleId,
        courseId: module.courseId,
        title: module.title,
        sortOrder: module.sortOrder,
        contentVersion: module.contentVersion,
      },
      update: {
        courseId: module.courseId,
        title: module.title,
        sortOrder: module.sortOrder,
        contentVersion: module.contentVersion,
        deletedAt: null,
      },
    });
  }

  private async upsertLesson(
    tx: Prisma.TransactionClient,
    lesson: LessonProjectionPayload,
  ): Promise<void> {
    await tx.lessonProjection.upsert({
      where: { lessonId: lesson.lessonId },
      create: {
        lessonId: lesson.lessonId,
        courseId: lesson.courseId,
        moduleId: lesson.moduleId,
        title: lesson.title,
        lessonType: lesson.lessonType,
        sortOrder: lesson.sortOrder,
        passingScore: lesson.passingScore,
        unlockNextOnPass: lesson.unlockNextOnPass,
        contentVersion: lesson.contentVersion,
        deletedAt: this.toDate(lesson.deletedAt),
      },
      update: {
        courseId: lesson.courseId,
        moduleId: lesson.moduleId,
        title: lesson.title,
        lessonType: lesson.lessonType,
        sortOrder: lesson.sortOrder,
        passingScore: lesson.passingScore,
        unlockNextOnPass: lesson.unlockNextOnPass,
        contentVersion: lesson.contentVersion,
        deletedAt: this.toDate(lesson.deletedAt),
      },
    });
  }

  private async markProcessed(
    tx: Prisma.TransactionClient,
    eventId: string,
  ): Promise<void> {
    await tx.eventInbox.update({
      where: { eventId },
      data: { processedAt: new Date() },
    });
  }

  private getCourseId(payload: CourseContentEventPayload): string {
    return payload.course.courseId;
  }

  private hashPayload(payload: CourseContentEventPayload): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private toDate(value?: string | null): Date | null {
    return value ? new Date(value) : null;
  }

  async rebuildFromCourseData(course: {
    id: string;
    title: string;
    slug: string;
    instructorId?: string;
    price?: string;
    status?: string;
    isSequential: boolean;
    totalLessons: number;
    totalMinutes: number;
    contentVersion?: number;
    publishedAt?: string | null;
    modules: Array<{
      id: string;
      title?: string;
      sortOrder: number;
      lessons: Array<{
        id: string;
        title: string;
        moduleId: string;
        sortOrder: number;
        lessonType?: string;
        passingScore?: number;
        unlockNextOnPass: boolean;
      }>;
    }>;
  }): Promise<void> {
    const contentVersion = course.contentVersion ?? 1;

    await this.prisma.$transaction(async (tx) => {
      await this.upsertCourse(tx, {
        courseId: course.id,
        title: course.title,
        slug: course.slug,
        instructorId: course.instructorId ?? 'unknown',
        price: course.price ?? '0',
        status: course.status ?? 'PUBLISHED',
        isSequential: course.isSequential,
        totalLessons: course.totalLessons,
        totalMinutes: course.totalMinutes,
        contentVersion,
        publishedAt: course.publishedAt ?? null,
      });

      for (const mod of course.modules) {
        await this.upsertModule(tx, {
          moduleId: mod.id,
          courseId: course.id,
          title: mod.title ?? '',
          sortOrder: mod.sortOrder,
          contentVersion,
        });

        for (const lesson of mod.lessons) {
          await this.upsertLesson(tx, {
            lessonId: lesson.id,
            courseId: course.id,
            moduleId: mod.id,
            title: lesson.title,
            lessonType: lesson.lessonType ?? 'TEXT',
            sortOrder: lesson.sortOrder,
            passingScore: lesson.passingScore ?? 60,
            unlockNextOnPass: lesson.unlockNextOnPass,
            contentVersion,
            deletedAt: null,
          });
        }
      }
    });

    this.logger.log(`Rebuilt projection for course=${course.id} (${course.title})`);
  }

  private isDuplicateInboxEvent(err: unknown): boolean {
    return (err as { code?: string } | undefined)?.code === 'P2002';
  }

  private isCourseEventEnvelope(
    value: unknown,
  ): value is CourseContentEventEnvelope {
    const candidate = value as Partial<CourseContentEventEnvelope> | undefined;
    return Boolean(
      candidate?.eventId &&
        candidate.eventType &&
        candidate.aggregateType &&
        candidate.aggregateId &&
        candidate.payload &&
        typeof candidate.payload.contentVersion === 'number',
    );
  }
}
