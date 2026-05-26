import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBindingDto } from './dto/create-binding.dto';
import { UpdateBindingDto } from './dto/update-binding.dto';

@Injectable()
export class CodingService {
  constructor(private readonly prisma: PrismaService) {}

  async getBinding(assignmentId: string) {
    const binding = await this.prisma.codeProblemBinding.findUnique({
      where: { assignmentId },
    });
    if (!binding) throw new NotFoundException(`No DMOJ binding for assignment ${assignmentId}`);
    return binding;
  }

  async createBinding(assignmentId: string, dto: CreateBindingDto, tenantId: string) {
    const existing = await this.prisma.codeProblemBinding.findUnique({ where: { assignmentId } });
    if (existing) throw new ConflictException('Binding already exists for this assignment');

    return this.prisma.codeProblemBinding.create({
      data: {
        tenantId,
        assignmentId,
        dmojProblemCode: dto.dmojProblemCode,
        dmojContestKey: dto.dmojContestKey,
        allowedLanguages: dto.allowedLanguages ?? [],
        maxScore: dto.maxScore ?? 100,
        passingScore: dto.passingScore ?? 60,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateBinding(assignmentId: string, dto: UpdateBindingDto) {
    await this.getBinding(assignmentId);
    return this.prisma.codeProblemBinding.update({
      where: { assignmentId },
      data: {
        ...(dto.dmojProblemCode && { dmojProblemCode: dto.dmojProblemCode }),
        ...(dto.dmojContestKey !== undefined && { dmojContestKey: dto.dmojContestKey }),
        ...(dto.allowedLanguages && { allowedLanguages: dto.allowedLanguages }),
        ...(dto.maxScore !== undefined && { maxScore: dto.maxScore }),
        ...(dto.passingScore !== undefined && { passingScore: dto.passingScore }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async getDmojUserLink(lmsUserId: string, tenantId: string) {
    return this.prisma.dmojUserLink.findUnique({
      where: { tenantId_lmsUserId: { tenantId, lmsUserId } },
    });
  }

  getLanguages(binding: { allowedLanguages: string[] }) {
    const defaults = ['CPP17', 'CPP14', 'PY3', 'JAVA'];
    return binding.allowedLanguages.length > 0 ? binding.allowedLanguages : defaults;
  }
}
