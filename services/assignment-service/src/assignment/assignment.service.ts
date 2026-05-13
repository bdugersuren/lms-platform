import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class AssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAssignmentDto) {
    return this.prisma.assignment.create({
      data: {
        courseId: dto.courseId,
        lessonId: dto.lessonId,
        title: dto.title,
        description: dto.description,
        type: dto.type ?? 'TEXT',
        maxScore: dto.maxScore ?? 100,
        passingScore: dto.passingScore ?? 60,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        allowLate: dto.allowLate ?? false,
      },
      include: { _count: { select: { submissions: true } } },
    });
  }

  async findAll(courseId?: string, lessonId?: string) {
    return this.prisma.assignment.findMany({
      where: {
        ...(courseId && { courseId }),
        ...(lessonId && { lessonId }),
      },
      include: { _count: { select: { submissions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    });
    if (!assignment) throw new NotFoundException(`Assignment ${id} not found`);
    return assignment;
  }

  async update(id: string, dto: UpdateAssignmentDto) {
    await this.findOne(id);
    return this.prisma.assignment.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: { _count: { select: { submissions: true } } },
    });
  }

  async publish(id: string) {
    await this.findOne(id);
    return this.prisma.assignment.update({
      where: { id },
      data: { isPublished: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.assignment.delete({ where: { id } });
  }
}
