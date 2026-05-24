import { Injectable, NotFoundException } from '@nestjs/common';
import { Course, Lesson, Module, Prisma } from '@prisma/client';
import {
  CourseContentEventEnvelope,
  CourseContentEventPatterns,
  CourseContentEventPayload,
  CourseLessonDeletedPayload,
  CourseLessonPayload,
  CourseLessonReorderedPayload,
  CourseProjectionPayload,
  CoursePublishedPayload,
  CourseSnapshotPayload,
  CourseUpdatedPayload,
  LessonProjectionPayload,
  ModuleProjectionPayload,
} from '@lms/shared-types';
import { OutboxService } from '../outbox/outbox.service';

type CourseWithCurriculum = Course & {
  modules: Array<Module & { lessons: Lesson[] }>;
};

@Injectable()
export class CourseEventsPublisher {
  constructor(private readonly outbox: OutboxService) {}

  publishPending(): Promise<void> {
    return this.outbox.publishPending();
  }

  async bumpContentVersion(
    tx: Prisma.TransactionClient,
    courseId: string,
  ): Promise<number> {
    const course = await tx.course.update({
      where: { id: courseId },
      data: { contentVersion: { increment: 1 } },
      select: { contentVersion: true },
    });
    return course.contentVersion;
  }

  async enqueuePublished(
    tx: Prisma.TransactionClient,
    courseId: string,
    contentVersion: number,
  ): Promise<void> {
    const snapshot = await this.buildSnapshot(tx, courseId, contentVersion);
    const payload: CoursePublishedPayload = {
      ...snapshot,
      publishedAt: snapshot.course.publishedAt ?? new Date().toISOString(),
    };
    await this.enqueue(
      tx,
      CourseContentEventPatterns.PUBLISHED,
      'course',
      courseId,
      contentVersion,
      payload,
    );
  }

  async enqueueCourseUpdated(
    tx: Prisma.TransactionClient,
    courseId: string,
    contentVersion: number,
    changedFields: string[],
  ): Promise<void> {
    const snapshot = await this.buildSnapshot(tx, courseId, contentVersion);
    const payload: CourseUpdatedPayload = { ...snapshot, changedFields };
    await this.enqueue(
      tx,
      CourseContentEventPatterns.UPDATED,
      'course',
      courseId,
      contentVersion,
      payload,
    );
  }

  async enqueueLessonEvent(
    tx: Prisma.TransactionClient,
    eventType:
      | typeof CourseContentEventPatterns.LESSON_CREATED
      | typeof CourseContentEventPatterns.LESSON_UPDATED,
    courseId: string,
    moduleId: string,
    lessonId: string,
    contentVersion: number,
  ): Promise<void> {
    const course = await this.findCourse(tx, courseId);
    const module = await tx.module.findUnique({ where: { id: moduleId } });
    const lesson = await tx.lesson.findUnique({ where: { id: lessonId } });

    if (!module) throw new NotFoundException('Module not found');
    if (!lesson) throw new NotFoundException('Lesson not found');

    const payload: CourseLessonPayload = {
      contentVersion,
      course: this.toCoursePayload(course, contentVersion),
      module: this.toModulePayload(module, contentVersion),
      lesson: this.toLessonPayload(courseId, lesson, contentVersion),
    };

    await this.enqueue(tx, eventType, 'lesson', lessonId, contentVersion, payload);
  }

  async enqueueLessonDeleted(
    tx: Prisma.TransactionClient,
    courseId: string,
    module: Module,
    lesson: Lesson,
    contentVersion: number,
    deletedAt: Date,
  ): Promise<void> {
    const course = await this.findCourse(tx, courseId);
    const deletedAtIso = deletedAt.toISOString();
    const payload: CourseLessonDeletedPayload = {
      contentVersion,
      deletedAt: deletedAtIso,
      course: this.toCoursePayload(course, contentVersion),
      module: this.toModulePayload(module, contentVersion),
      lesson: this.toLessonPayload(courseId, lesson, contentVersion, deletedAtIso),
    };

    await this.enqueue(
      tx,
      CourseContentEventPatterns.LESSON_DELETED,
      'lesson',
      lesson.id,
      contentVersion,
      payload,
    );
  }

  async enqueueLessonReordered(
    tx: Prisma.TransactionClient,
    courseId: string,
    contentVersion: number,
  ): Promise<void> {
    const snapshot = await this.buildSnapshot(tx, courseId, contentVersion);
    const payload: CourseLessonReorderedPayload = {
      ...snapshot,
      order: snapshot.lessons.map((lesson) => ({
        moduleId: lesson.moduleId,
        lessonId: lesson.lessonId,
        sortOrder: lesson.sortOrder,
      })),
    };

    await this.enqueue(
      tx,
      CourseContentEventPatterns.LESSON_REORDERED,
      'course',
      courseId,
      contentVersion,
      payload,
    );
  }

  private async buildSnapshot(
    tx: Prisma.TransactionClient,
    courseId: string,
    contentVersion: number,
  ): Promise<CourseSnapshotPayload> {
    const course = await tx.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: { lessons: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    return {
      contentVersion,
      course: this.toCoursePayload(course, contentVersion),
      modules: course.modules.map((module) =>
        this.toModulePayload(module, contentVersion),
      ),
      lessons: course.modules.flatMap((module) =>
        module.lessons.map((lesson) =>
          this.toLessonPayload(course.id, lesson, contentVersion),
        ),
      ),
    };
  }

  private async findCourse(
    tx: Prisma.TransactionClient,
    courseId: string,
  ): Promise<Course> {
    const course = await tx.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  private toCoursePayload(
    course: Course | CourseWithCurriculum,
    contentVersion: number,
  ): CourseProjectionPayload {
    return {
      courseId: course.id,
      tenantId: course.tenantId,
      title: course.title,
      slug: course.slug,
      instructorId: course.instructorId,
      price: course.price.toString(),
      status: course.status,
      isSequential: course.isSequential,
      totalLessons: course.totalLessons,
      totalMinutes: course.totalMinutes,
      contentVersion,
      publishedAt: course.publishedAt?.toISOString() ?? null,
      requireQuizPass: course.requireQuizPass,
      requireAssignmentPass: course.requireAssignmentPass,
      minimumScorePercent: course.minimumScorePercent,
    };
  }

  private toModulePayload(
    module: Module,
    contentVersion: number,
  ): ModuleProjectionPayload {
    return {
      moduleId: module.id,
      courseId: module.courseId,
      title: module.title,
      sortOrder: module.sortOrder,
      contentVersion,
    };
  }

  private toLessonPayload(
    courseId: string,
    lesson: Lesson,
    contentVersion: number,
    deletedAt?: string | null,
  ): LessonProjectionPayload {
    return {
      lessonId: lesson.id,
      courseId,
      moduleId: lesson.moduleId,
      title: lesson.title,
      lessonType: lesson.lessonType,
      sortOrder: lesson.sortOrder,
      passingScore: lesson.passingScore,
      unlockNextOnPass: lesson.unlockNextOnPass,
      contentVersion,
      deletedAt: deletedAt ?? null,
    };
  }

  private async enqueue(
    tx: Prisma.TransactionClient,
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    contentVersion: number,
    payload: CourseSnapshotPayload | CourseLessonPayload,
  ): Promise<void> {
    const occurredAt = new Date().toISOString();
    const envelope: CourseContentEventEnvelope = {
      eventId: `${eventType}:${aggregateId}:${contentVersion}`,
      eventType,
      eventVersion: 1,
      occurredAt,
      producer: 'course-service',
      aggregateType,
      aggregateId,
      sequence: contentVersion,
      payload: payload as CourseContentEventPayload,
    };

    await this.outbox.enqueue(tx, envelope);
  }
}
