import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInteractiveBlockDto } from './dto/create-interactive-block.dto';
import { UpdateInteractiveBlockDto } from './dto/update-interactive-block.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CreateOptionDto } from './dto/create-option.dto';

@Injectable()
export class InteractiveService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Interactive Blocks ───────────────────────────────────────────────────

  async createBlock(lessonId: string, dto: CreateInteractiveBlockDto, user: JwtPayload) {
    await this.assertLessonOwnerOrAdmin(lessonId, user);

    const block = await this.prisma.interactiveBlock.create({
      data: {
        lessonId,
        title: dto.title,
        blockType: dto.blockType,
        sortOrder: dto.sortOrder ?? 0,
        triggerSecond: dto.triggerSecond,
        triggerPage: dto.triggerPage,
        triggerParagraph: dto.triggerParagraph,
        contentJson: (dto.contentJson as Prisma.InputJsonValue) ?? {},
        isRequired: dto.isRequired ?? true,
        passingScore: dto.passingScore,
        unlockNextContent: dto.unlockNextContent ?? true,
        continueOnPassOnly: dto.continueOnPassOnly ?? true,
      },
    });

    return ApiResponseBuilder.success(block, 'Interactive block created');
  }

  async findBlocksByLesson(lessonId: string) {
    const blocks = await this.prisma.interactiveBlock.findMany({
      where: { lessonId },
      orderBy: { sortOrder: 'asc' },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });

    return ApiResponseBuilder.success(blocks, 'Interactive blocks retrieved');
  }

  async findBlock(blockId: string) {
    const block = await this.prisma.interactiveBlock.findUnique({
      where: { id: blockId },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });

    if (!block) throw new NotFoundException('Interactive block not found');

    return ApiResponseBuilder.success(block, 'Interactive block retrieved');
  }

  async updateBlock(blockId: string, dto: UpdateInteractiveBlockDto, user: JwtPayload) {
    const block = await this.prisma.interactiveBlock.findUnique({ where: { id: blockId } });
    if (!block) throw new NotFoundException('Interactive block not found');

    await this.assertLessonOwnerOrAdmin(block.lessonId, user);

    const data: Prisma.InteractiveBlockUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.blockType !== undefined) data.blockType = dto.blockType;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.triggerSecond !== undefined) data.triggerSecond = dto.triggerSecond;
    if (dto.triggerPage !== undefined) data.triggerPage = dto.triggerPage;
    if (dto.triggerParagraph !== undefined) data.triggerParagraph = dto.triggerParagraph;
    if (dto.contentJson !== undefined) data.contentJson = dto.contentJson as Prisma.InputJsonValue;
    if (dto.isRequired !== undefined) data.isRequired = dto.isRequired;
    if (dto.passingScore !== undefined) data.passingScore = dto.passingScore;
    if (dto.unlockNextContent !== undefined) data.unlockNextContent = dto.unlockNextContent;
    if (dto.continueOnPassOnly !== undefined) data.continueOnPassOnly = dto.continueOnPassOnly;

    const updated = await this.prisma.interactiveBlock.update({ where: { id: blockId }, data });

    return ApiResponseBuilder.success(updated, 'Interactive block updated');
  }

  async deleteBlock(blockId: string, user: JwtPayload) {
    const block = await this.prisma.interactiveBlock.findUnique({ where: { id: blockId } });
    if (!block) throw new NotFoundException('Interactive block not found');

    await this.assertLessonOwnerOrAdmin(block.lessonId, user);

    await this.prisma.interactiveBlock.delete({ where: { id: blockId } });

    return ApiResponseBuilder.success(null, 'Interactive block deleted');
  }

  // ─── Questions ────────────────────────────────────────────────────────────

  async createQuestion(blockId: string, dto: CreateQuestionDto, user: JwtPayload) {
    const block = await this.prisma.interactiveBlock.findUnique({ where: { id: blockId } });
    if (!block) throw new NotFoundException('Interactive block not found');

    await this.assertLessonOwnerOrAdmin(block.lessonId, user);

    const question = await this.prisma.interactiveQuestion.create({
      data: {
        interactiveBlockId: blockId,
        questionType: dto.questionType,
        questionText: dto.questionText,
        explanation: dto.explanation,
        score: dto.score ?? 1,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return ApiResponseBuilder.success(question, 'Question created');
  }

  async updateQuestion(questionId: string, dto: UpdateQuestionDto, user: JwtPayload) {
    const question = await this.prisma.interactiveQuestion.findUnique({
      where: { id: questionId },
      include: { interactiveBlock: true },
    });
    if (!question) throw new NotFoundException('Question not found');

    await this.assertLessonOwnerOrAdmin(question.interactiveBlock.lessonId, user);

    const data: Prisma.InteractiveQuestionUpdateInput = {};
    if (dto.questionType !== undefined) data.questionType = dto.questionType;
    if (dto.questionText !== undefined) data.questionText = dto.questionText;
    if (dto.explanation !== undefined) data.explanation = dto.explanation;
    if (dto.score !== undefined) data.score = dto.score;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const updated = await this.prisma.interactiveQuestion.update({
      where: { id: questionId },
      data,
    });

    return ApiResponseBuilder.success(updated, 'Question updated');
  }

  async deleteQuestion(questionId: string, user: JwtPayload) {
    const question = await this.prisma.interactiveQuestion.findUnique({
      where: { id: questionId },
      include: { interactiveBlock: true },
    });
    if (!question) throw new NotFoundException('Question not found');

    await this.assertLessonOwnerOrAdmin(question.interactiveBlock.lessonId, user);

    await this.prisma.interactiveQuestion.delete({ where: { id: questionId } });

    return ApiResponseBuilder.success(null, 'Question deleted');
  }

  // ─── Options ──────────────────────────────────────────────────────────────

  async createOption(questionId: string, dto: CreateOptionDto, user: JwtPayload) {
    const question = await this.prisma.interactiveQuestion.findUnique({
      where: { id: questionId },
      include: { interactiveBlock: true },
    });
    if (!question) throw new NotFoundException('Question not found');

    await this.assertLessonOwnerOrAdmin(question.interactiveBlock.lessonId, user);

    const option = await this.prisma.interactiveQuestionOption.create({
      data: {
        questionId,
        optionText: dto.optionText,
        isCorrect: dto.isCorrect ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return ApiResponseBuilder.success(option, 'Option created');
  }

  async updateOption(optionId: string, dto: Partial<CreateOptionDto>, user: JwtPayload) {
    const option = await this.prisma.interactiveQuestionOption.findUnique({
      where: { id: optionId },
      include: {
        question: { include: { interactiveBlock: true } },
      },
    });
    if (!option) throw new NotFoundException('Option not found');

    await this.assertLessonOwnerOrAdmin(option.question.interactiveBlock.lessonId, user);

    const data: Prisma.InteractiveQuestionOptionUpdateInput = {};
    if (dto.optionText !== undefined) data.optionText = dto.optionText;
    if (dto.isCorrect !== undefined) data.isCorrect = dto.isCorrect;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const updated = await this.prisma.interactiveQuestionOption.update({
      where: { id: optionId },
      data,
    });

    return ApiResponseBuilder.success(updated, 'Option updated');
  }

  async deleteOption(optionId: string, user: JwtPayload) {
    const option = await this.prisma.interactiveQuestionOption.findUnique({
      where: { id: optionId },
      include: {
        question: { include: { interactiveBlock: true } },
      },
    });
    if (!option) throw new NotFoundException('Option not found');

    await this.assertLessonOwnerOrAdmin(option.question.interactiveBlock.lessonId, user);

    await this.prisma.interactiveQuestionOption.delete({ where: { id: optionId } });

    return ApiResponseBuilder.success(null, 'Option deleted');
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

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
