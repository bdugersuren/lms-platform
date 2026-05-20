import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { CourseContentEventPatterns, JwtPayload, UserRole } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { CourseEventsPublisher } from './course-events.publisher';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ModuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseEvents: CourseEventsPublisher,
  ) {}

  async create(courseId: string, dto: CreateModuleDto, user: JwtPayload) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.assertOwnerOrAdmin(course.instructorId, user);

    const module = await this.prisma.$transaction(async (tx) => {
      const created = await tx.module.create({
        data: {
          courseId,
          title: dto.title,
          description: dto.description,
          sortOrder: dto.sortOrder ?? 0,
          unlockScore: dto.unlockScore,
        },
      });
      const contentVersion = await this.courseEvents.bumpContentVersion(tx, courseId);
      await this.courseEvents.enqueueCourseUpdated(tx, courseId, contentVersion, [
        'modules',
      ]);
      return created;
    });

    await this.courseEvents.publishPending();

    return ApiResponseBuilder.success(module, 'Module created');
  }

  async findByCourse(courseId: string) {
    const modules = await this.prisma.module.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
      include: {
        lessons: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return ApiResponseBuilder.success(modules, 'Modules retrieved');
  }

  async update(courseId: string, moduleId: string, dto: Partial<CreateModuleDto>, user: JwtPayload) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.assertOwnerOrAdmin(course.instructorId, user);

    const existing = await this.prisma.module.findFirst({ where: { id: moduleId, courseId } });
    if (!existing) throw new NotFoundException('Module not found');

    const data: Prisma.ModuleUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.unlockScore !== undefined) data.unlockScore = dto.unlockScore;

    const sortOrderChanged =
      dto.sortOrder !== undefined && dto.sortOrder !== existing.sortOrder;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.module.update({ where: { id: moduleId }, data });
      const contentVersion = await this.courseEvents.bumpContentVersion(tx, courseId);
      await this.courseEvents.enqueueCourseUpdated(tx, courseId, contentVersion, [
        'modules',
      ]);
      if (sortOrderChanged) {
        await this.courseEvents.enqueueLessonReordered(tx, courseId, contentVersion);
      }
      return result;
    });

    await this.courseEvents.publishPending();

    return ApiResponseBuilder.success(updated, 'Module updated');
  }

  async remove(courseId: string, moduleId: string, user: JwtPayload) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.assertOwnerOrAdmin(course.instructorId, user);

    const existing = await this.prisma.module.findFirst({
      where: { id: moduleId, courseId },
      include: { lessons: true },
    });
    if (!existing) throw new NotFoundException('Module not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.module.delete({ where: { id: moduleId } });
      await this.updateCourseTotals(courseId, tx);
      const contentVersion = await this.courseEvents.bumpContentVersion(tx, courseId);
      const deletedAt = new Date();

      for (const lesson of existing.lessons) {
        await this.courseEvents.enqueueLessonDeleted(
          tx,
          courseId,
          existing,
          lesson,
          contentVersion,
          deletedAt,
        );
      }

      await this.courseEvents.enqueueCourseUpdated(tx, courseId, contentVersion, [
        'modules',
      ]);
    });

    await this.courseEvents.publishPending();

    return ApiResponseBuilder.success(null, 'Module deleted');
  }

  private async updateCourseTotals(
    courseId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<void> {
    const result = await db.lesson.aggregate({
      where: { module: { courseId } },
      _count: true,
      _sum: { estimatedMinutes: true },
    });

    await db.course.update({
      where: { id: courseId },
      data: {
        totalLessons: result._count,
        totalMinutes: result._sum.estimatedMinutes ?? 0,
      },
    });
  }

  private assertOwnerOrAdmin(instructorId: string, user: JwtPayload): void {
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    if (!isAdmin && user.sub !== instructorId) throw new ForbiddenException('Access denied');
  }
}
