import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus, Prisma } from '@prisma/client';
import slugify from 'slugify';
import { ApiResponseBuilder, buildPaginationMeta } from '@lms/shared-utils';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { CourseEventPatterns } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { CourseEventsPublisher } from './course-events.publisher';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseQueryDto } from './dto/course-query.dto';

@Injectable()
export class CourseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly courseEvents: CourseEventsPublisher,
  ) {}

  async create(dto: CreateCourseDto, user: JwtPayload, tenantId = 'demo') {
    const slug = await this.generateUniqueSlug(dto.title, tenantId);

    const course = await this.prisma.course.create({
      data: {
        tenantId,
        title: dto.title,
        slug,
        description: dto.description,
        thumbnail: dto.thumbnail,
        instructorId: user.sub,
        price: dto.price ? new Prisma.Decimal(dto.price) : new Prisma.Decimal(0),
        level: dto.level ?? 'BEGINNER',
        tags: dto.tags ?? [],
        language: dto.language ?? 'mn',
        isSequential: dto.isSequential ?? true,
        passingScore: dto.passingScore ?? 60,
      },
    });

    void this.messaging.publishEvent(CourseEventPatterns.CREATED, {
      courseId: course.id,
      tenantId: course.tenantId,
      title: course.title,
      slug: course.slug,
      instructorId: course.instructorId,
    });

    return ApiResponseBuilder.success(course, 'Course created successfully');
  }

  async findAll(query: CourseQueryDto, tenantId = 'demo') {
    const { page = 1, limit = 20, status, level, instructorId, search } = query;

    const where: Prisma.CourseWhereInput = { tenantId };
    if (status) where.status = status;
    if (level) where.level = level;
    if (instructorId) where.instructorId = instructorId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnail: true,
          instructorId: true,
          price: true,
          level: true,
          status: true,
          tags: true,
          language: true,
          totalLessons: true,
          totalMinutes: true,
          passingScore: true,
          isSequential: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return ApiResponseBuilder.success(
      { items: courses, meta: buildPaginationMeta({ page, limit }, total) },
      'Courses retrieved',
    );
  }

  async findOne(id: string, tenantId = 'demo') {
    const course = await this.prisma.course.findFirst({
      where: { id, tenantId },
      include: {
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
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
            },
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    return ApiResponseBuilder.success(course, 'Course retrieved');
  }

  async findBySlug(slug: string, tenantId = 'demo') {
    const course = await this.prisma.course.findFirst({
      where: { slug, tenantId },
      include: {
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
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
            },
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    return ApiResponseBuilder.success(course, 'Course retrieved');
  }

  async update(id: string, dto: UpdateCourseDto, user: JwtPayload, tenantId = 'demo') {
    const course = await this.prisma.course.findFirst({ where: { id, tenantId } });
    if (!course) throw new NotFoundException('Course not found');

    this.assertOwnerOrAdmin(course.instructorId, user);

    const data: Prisma.CourseUpdateInput = {};
    if (dto.title !== undefined) {
      data.title = dto.title;
      data.slug = await this.generateUniqueSlug(dto.title, tenantId, id);
    }
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.thumbnail !== undefined) data.thumbnail = dto.thumbnail;
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.language !== undefined) data.language = dto.language;
    if (dto.isSequential !== undefined) data.isSequential = dto.isSequential;
    if (dto.passingScore !== undefined) data.passingScore = dto.passingScore;

    const changedFields = Object.entries(dto)
      .filter(([, value]) => value !== undefined)
      .map(([field]) => field);

    if (changedFields.length === 0) {
      return ApiResponseBuilder.success(course, 'Course updated');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.course.update({
        where: { id },
        data: { ...data, contentVersion: { increment: 1 } },
      });
      await this.courseEvents.enqueueCourseUpdated(tx, id, result.contentVersion, changedFields);
      return result;
    });

    await this.courseEvents.publishPending();

    return ApiResponseBuilder.success(updated, 'Course updated');
  }

  async publish(id: string, user: JwtPayload, tenantId = 'demo') {
    const course = await this.prisma.course.findFirst({ where: { id, tenantId } });
    if (!course) throw new NotFoundException('Course not found');

    this.assertOwnerOrAdmin(course.instructorId, user);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.course.update({
        where: { id },
        data: {
          status: CourseStatus.PUBLISHED,
          publishedAt: new Date(),
          contentVersion: { increment: 1 },
        },
      });
      await this.courseEvents.enqueuePublished(tx, id, result.contentVersion);
      return result;
    });

    await this.courseEvents.publishPending();

    void this.messaging.publishEvent(CourseEventPatterns.PUBLISHED, {
      courseId: course.id,
      tenantId: course.tenantId,
      title: course.title,
      instructorId: course.instructorId,
    });

    return ApiResponseBuilder.success(updated, 'Course published');
  }

  async archive(id: string, user: JwtPayload, tenantId = 'demo') {
    const course = await this.prisma.course.findFirst({ where: { id, tenantId } });
    if (!course) throw new NotFoundException('Course not found');

    this.assertOwnerOrAdmin(course.instructorId, user);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.course.update({
        where: { id },
        data: {
          status: CourseStatus.ARCHIVED,
          contentVersion: { increment: 1 },
        },
      });
      await this.courseEvents.enqueueCourseUpdated(tx, id, result.contentVersion, ['status']);
      return result;
    });

    await this.courseEvents.publishPending();

    void this.messaging.publishEvent(CourseEventPatterns.ARCHIVED, {
      courseId: course.id,
      tenantId: course.tenantId,
      instructorId: course.instructorId,
    });

    return ApiResponseBuilder.success(updated, 'Course archived');
  }

  async remove(id: string, user: JwtPayload, tenantId = 'demo') {
    const course = await this.prisma.course.findFirst({ where: { id, tenantId } });
    if (!course) throw new NotFoundException('Course not found');

    this.assertOwnerOrAdmin(course.instructorId, user);

    await this.prisma.course.delete({ where: { id } });

    return ApiResponseBuilder.success(null, 'Course deleted');
  }

  private async generateUniqueSlug(
    title: string,
    tenantId = 'demo',
    excludeId?: string,
  ): Promise<string> {
    const base = slugify(title, { lower: true, strict: true });
    let slug = base;
    let attempt = 0;

    while (true) {
      const existing = await this.prisma.course.findFirst({ where: { slug, tenantId } });
      if (!existing || existing.id === excludeId) return slug;
      attempt++;
      slug = `${base}-${attempt}`;
    }
  }

  assertOwnerOrAdmin(instructorId: string, user: JwtPayload): void {
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    if (!isAdmin && user.sub !== instructorId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
