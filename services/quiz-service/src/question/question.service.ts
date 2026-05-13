import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(quizId: string, dto: CreateQuestionDto) {
    await this.assertQuizExists(quizId);

    return this.prisma.question.create({
      data: {
        quizId,
        questionType: dto.questionType,
        questionText: dto.questionText,
        explanation: dto.explanation,
        score: dto.score ?? 1,
        sortOrder: dto.sortOrder ?? 0,
        options: dto.options
          ? {
              create: dto.options.map((o) => ({
                optionText: o.optionText,
                isCorrect: o.isCorrect,
                sortOrder: o.sortOrder ?? 0,
              })),
            }
          : undefined,
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findAllByQuiz(quizId: string) {
    await this.assertQuizExists(quizId);
    return this.prisma.question.findMany({
      where: { quizId },
      orderBy: { sortOrder: 'asc' },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findOne(quizId: string, questionId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, quizId },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!question) throw new NotFoundException(`Question ${questionId} not found`);
    return question;
  }

  async update(quizId: string, questionId: string, dto: Partial<CreateQuestionDto>) {
    await this.findOne(quizId, questionId);

    const { options, ...rest } = dto;

    return this.prisma.question.update({
      where: { id: questionId },
      data: {
        ...rest,
        ...(options && {
          options: {
            deleteMany: {},
            create: options.map((o) => ({
              optionText: o.optionText,
              isCorrect: o.isCorrect,
              sortOrder: o.sortOrder ?? 0,
            })),
          },
        }),
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async remove(quizId: string, questionId: string) {
    await this.findOne(quizId, questionId);
    await this.prisma.question.delete({ where: { id: questionId } });
  }

  private async assertQuizExists(quizId: string): Promise<void> {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException(`Quiz ${quizId} not found`);
  }
}
