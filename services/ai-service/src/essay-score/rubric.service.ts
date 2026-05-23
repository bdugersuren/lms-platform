import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';

export class RubricCriterionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ description: 'Max points for this criterion' })
  @IsNumber()
  @Min(1)
  maxScore: number;
}

export class CreateRubricDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ description: 'Link rubric to a specific assignment' })
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @ApiProperty({ type: [RubricCriterionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricCriterionDto)
  criteria: RubricCriterionDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@Injectable()
export class RubricService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateRubricDto) {
    if (dto.isDefault) {
      const existing = await this.prisma.essayRubric.findFirst({ where: { isDefault: true } });
      if (existing) throw new BadRequestException('A default rubric already exists');
    }
    return this.prisma.essayRubric.create({
      data: {
        name: dto.name,
        assignmentId: dto.assignmentId,
        criteria: dto.criteria as object[],
        isDefault: dto.isDefault ?? false,
        createdBy: userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.essayRubric.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const rubric = await this.prisma.essayRubric.findUnique({ where: { id } });
    if (!rubric) throw new NotFoundException('Rubric not found');
    return rubric;
  }

  async remove(userId: string, id: string) {
    const rubric = await this.prisma.essayRubric.findUnique({ where: { id } });
    if (!rubric) throw new NotFoundException('Rubric not found');
    if (rubric.createdBy !== userId) throw new ForbiddenException('Not your rubric');
    await this.prisma.essayRubric.delete({ where: { id } });
  }
}
