import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuizDto, instructorId: string) {
    return this.prisma.quiz.create({
      data: {
        courseId: dto.courseId,
        lessonId: dto.lessonId,
        title: dto.title,
        description: dto.description,
        passingScore: dto.passingScore ?? 70,
        timeLimit: dto.timeLimit,
        maxAttempts: dto.maxAttempts ?? 3,
        isAdaptive: dto.isAdaptive ?? false,
      },
      include: { questions: { include: { options: true } } },
    });
  }

  async findAll(courseId?: string, lessonId?: string) {
    return this.prisma.quiz.findMany({
      where: {
        ...(courseId && { courseId }),
        ...(lessonId && { lessonId }),
      },
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
        _count: { select: { attempts: true } },
      },
    });

    if (!quiz) throw new NotFoundException(`Quiz ${id} not found`);
    return quiz;
  }

  async update(id: string, dto: UpdateQuizDto) {
    await this.findOne(id);
    return this.prisma.quiz.update({
      where: { id },
      data: dto,
      include: { questions: { include: { options: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.quiz.delete({ where: { id } });
  }

  async publish(id: string) {
    await this.findOne(id);
    return this.prisma.quiz.update({
      where: { id },
      data: { isPublished: true },
    });
  }

  async getStudentAttemptCount(quizId: string, studentId: string): Promise<number> {
    return this.prisma.quizAttempt.count({ where: { quizId, studentId } });
  }

  async assertCanAttempt(quizId: string, studentId: string): Promise<void> {
    const quiz = await this.findOne(quizId);
    const count = await this.getStudentAttemptCount(quizId, studentId);
    if (count >= quiz.maxAttempts) {
      throw new ForbiddenException(`Maximum attempts (${quiz.maxAttempts}) reached`);
    }
  }
}
