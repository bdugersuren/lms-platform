import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';

@Injectable()
export class ModuleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(courseId: string, dto: CreateModuleDto, user: JwtPayload) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.assertOwnerOrAdmin(course.instructorId, user);

    const module = await this.prisma.module.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        unlockScore: dto.unlockScore,
      },
    });

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

    const updated = await this.prisma.module.update({ where: { id: moduleId }, data });

    return ApiResponseBuilder.success(updated, 'Module updated');
  }

  async remove(courseId: string, moduleId: string, user: JwtPayload) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.assertOwnerOrAdmin(course.instructorId, user);

    const existing = await this.prisma.module.findFirst({ where: { id: moduleId, courseId } });
    if (!existing) throw new NotFoundException('Module not found');

    await this.prisma.module.delete({ where: { id: moduleId } });

    return ApiResponseBuilder.success(null, 'Module deleted');
  }

  private assertOwnerOrAdmin(instructorId: string, user: JwtPayload): void {
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    if (!isAdmin && user.sub !== instructorId) throw new ForbiddenException('Access denied');
  }
}
