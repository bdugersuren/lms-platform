import { Injectable } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

export class AiLogQueryDto {
  @ApiPropertyOptional({ enum: ['TUTOR', 'ESSAY_SCORE', 'RECOMMENDATION'] })
  @IsOptional()
  @IsIn(['TUTOR', 'ESSAY_SCORE', 'RECOMMENDATION'])
  service?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'ISO date from' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date to' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number;
}

@Injectable()
export class AiLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AiLogQueryDto) {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 50), 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(query.service && { service: query.service }),
      ...(query.userId && { userId: query.userId }),
      ...((query.from || query.to) && {
        createdAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.aiInteractionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.aiInteractionLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
