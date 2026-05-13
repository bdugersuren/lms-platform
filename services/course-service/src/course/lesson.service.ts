import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';

@Injectable()
export class LessonService {
  constructor(private readonly prisma: PrismaService) {}

  async create(courseId: string, moduleId: string, dto: CreateLessonDto, user: JwtPayload) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.assertOwnerOrAdmin(course.instructorId, user);

    const module = await this.prisma.module.findFirst({ where: { id: moduleId, courseId } });
    if (!module) throw new NotFoundException('Module not found');

    const lesson = await this.prisma.lesson.create({
      data: {
        moduleId,
        title: dto.title,
        description: dto.description,
        lessonType: dto.lessonType ?? 'TEXT',
        sortOrder: dto.sortOrder ?? 0,
        contentUrl: dto.contentUrl,
        rawMarkdown: dto.rawMarkdown,
        rawText: dto.rawText,
        estimatedMinutes: dto.estimatedMinutes,
        isPreview: dto.isPreview ?? false,
        passingScore: dto.passingScore ?? 60,
        unlockNextOnPass: dto.unlockNextOnPass ?? true,
      },
    });

    await this.updateCourseTotals(courseId);

    return ApiResponseBuilder.success(lesson, 'Lesson created');
  }

  async findByModule(courseId: string, moduleId: string) {
    const module = await this.prisma.module.findFirst({ where: { id: moduleId, courseId } });
    if (!module) throw new NotFoundException('Module not found');

    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { sortOrder: 'asc' },
      include: {
        interactiveBlocks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
              include: { options: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
      },
    });

    return ApiResponseBuilder.success(lessons, 'Lessons retrieved');
  }

  async findOne(courseId: string, moduleId: string, lessonId: string) {
    const module = await this.prisma.module.findFirst({ where: { id: moduleId, courseId } });
    if (!module) throw new NotFoundException('Module not found');

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, moduleId },
      include: {
        interactiveBlocks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
              include: { options: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    return ApiResponseBuilder.success(lesson, 'Lesson retrieved');
  }

  async update(courseId: string, moduleId: string, lessonId: string, dto: Partial<CreateLessonDto>, user: JwtPayload) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.assertOwnerOrAdmin(course.instructorId, user);

    const lesson = await this.prisma.lesson.findFirst({ where: { id: lessonId, moduleId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const data: Prisma.LessonUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.lessonType !== undefined) data.lessonType = dto.lessonType;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.contentUrl !== undefined) data.contentUrl = dto.contentUrl;
    if (dto.rawMarkdown !== undefined) data.rawMarkdown = dto.rawMarkdown;
    if (dto.rawText !== undefined) data.rawText = dto.rawText;
    if (dto.estimatedMinutes !== undefined) data.estimatedMinutes = dto.estimatedMinutes;
    if (dto.isPreview !== undefined) data.isPreview = dto.isPreview;
    if (dto.passingScore !== undefined) data.passingScore = dto.passingScore;
    if (dto.unlockNextOnPass !== undefined) data.unlockNextOnPass = dto.unlockNextOnPass;

    const updated = await this.prisma.lesson.update({ where: { id: lessonId }, data });

    if (dto.estimatedMinutes !== undefined) await this.updateCourseTotals(courseId);

    return ApiResponseBuilder.success(updated, 'Lesson updated');
  }

  async remove(courseId: string, moduleId: string, lessonId: string, user: JwtPayload) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.assertOwnerOrAdmin(course.instructorId, user);

    const lesson = await this.prisma.lesson.findFirst({ where: { id: lessonId, moduleId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    await this.prisma.lesson.delete({ where: { id: lessonId } });
    await this.updateCourseTotals(courseId);

    return ApiResponseBuilder.success(null, 'Lesson deleted');
  }

  async updateCourseTotals(courseId: string): Promise<void> {
    const result = await this.prisma.lesson.aggregate({
      where: { module: { courseId } },
      _count: true,
      _sum: { estimatedMinutes: true },
    });

    await this.prisma.course.update({
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
