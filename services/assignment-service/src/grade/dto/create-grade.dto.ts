import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateGradeDto {
  @ApiProperty({ description: 'Score given' })
  @IsNumber()
  @Min(0)
  score!: number;

  @ApiPropertyOptional({ description: 'Feedback comment' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
