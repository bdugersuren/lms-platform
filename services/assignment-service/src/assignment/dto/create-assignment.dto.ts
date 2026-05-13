import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

enum AssignmentType {
  FILE_UPLOAD = 'FILE_UPLOAD',
  TEXT = 'TEXT',
  LINK = 'LINK',
  CODE = 'CODE',
}

export class CreateAssignmentDto {
  @ApiProperty()
  @IsUUID()
  courseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: AssignmentType, default: AssignmentType.TEXT })
  @IsOptional()
  @IsEnum(AssignmentType)
  type?: AssignmentType;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxScore?: number;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({ description: 'ISO 8601 due date' })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowLate?: boolean;
}
