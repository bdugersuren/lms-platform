import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillDto } from './dto/create-skill.dto';

@Injectable()
export class SkillService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const skills = await this.prisma.skill.findMany({
      orderBy: { name: 'asc' },
    });
    return ApiResponseBuilder.success(skills, 'Skills retrieved');
  }

  async create(dto: CreateSkillDto) {
    const existing = await this.prisma.skill.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Skill with this name already exists');

    const skill = await this.prisma.skill.create({
      data: { name: dto.name, category: dto.category },
    });

    return ApiResponseBuilder.success(skill, 'Skill created');
  }

  async remove(id: string) {
    const skill = await this.prisma.skill.findUnique({ where: { id } });
    if (!skill) throw new NotFoundException('Skill not found');

    await this.prisma.skill.delete({ where: { id } });

    return ApiResponseBuilder.success(null, 'Skill deleted');
  }

  async attachSkillToLesson(lessonId: string, skillId: string, user: JwtPayload) {
    await this.assertLessonOwnerOrAdmin(lessonId, user);

    const skill = await this.prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) throw new NotFoundException('Skill not found');

    const existing = await this.prisma.lessonSkill.findUnique({
      where: { lessonId_skillId: { lessonId, skillId } },
    });
    if (existing) throw new ConflictException('Skill already attached to lesson');

    const lessonSkill = await this.prisma.lessonSkill.create({
      data: { lessonId, skillId },
    });

    return ApiResponseBuilder.success(lessonSkill, 'Skill attached to lesson');
  }

  async detachSkillFromLesson(lessonId: string, skillId: string, user: JwtPayload) {
    await this.assertLessonOwnerOrAdmin(lessonId, user);

    const existing = await this.prisma.lessonSkill.findUnique({
      where: { lessonId_skillId: { lessonId, skillId } },
    });
    if (!existing) throw new NotFoundException('Skill not attached to lesson');

    await this.prisma.lessonSkill.delete({
      where: { lessonId_skillId: { lessonId, skillId } },
    });

    return ApiResponseBuilder.success(null, 'Skill detached from lesson');
  }

  private async assertLessonOwnerOrAdmin(lessonId: string, user: JwtPayload): Promise<void> {
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    if (isAdmin) return;

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');

    if (lesson.module.course.instructorId !== user.sub) {
      throw new ForbiddenException('Access denied');
    }
  }
}
