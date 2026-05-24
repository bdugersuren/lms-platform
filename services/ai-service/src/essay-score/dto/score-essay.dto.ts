import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ScoreEssayDto {
  @ApiProperty({ description: 'Essay text to score' })
  @IsString()
  @MinLength(50)
  @MaxLength(10000)
  essayText: string;

  @ApiPropertyOptional({ description: 'Assignment ID this essay belongs to' })
  @IsOptional()
  @IsString()
  assignmentId?: string;

  @ApiPropertyOptional({ description: 'Assignment prompt / topic for context' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  prompt?: string;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Custom rubric ID (teacher-configured)' })
  @IsOptional()
  @IsString()
  rubricId?: string;
}
