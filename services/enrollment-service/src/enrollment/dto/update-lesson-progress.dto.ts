import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLessonProgressDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @ApiPropertyOptional({ description: 'Lesson score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  score?: number;
}
