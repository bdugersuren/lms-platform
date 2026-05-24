import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateQuizDto {
  @ApiProperty({ description: 'Course ID this quiz belongs to' })
  @IsString()
  courseId!: string;

  @ApiPropertyOptional({ description: 'Lesson ID (optional — quiz can be standalone)' })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiProperty({ description: 'Quiz title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Quiz description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Passing score percentage (0-100)', default: 70 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({ description: 'Time limit in minutes (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Maximum allowed attempts', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiPropertyOptional({ description: 'Enable adaptive exam mode', default: false })
  @IsOptional()
  @IsBoolean()
  isAdaptive?: boolean;
}
