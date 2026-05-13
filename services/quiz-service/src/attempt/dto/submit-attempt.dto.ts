import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @ApiProperty({ description: 'Question ID' })
  @IsUUID()
  questionId!: string;

  @ApiPropertyOptional({ type: [String], description: 'Selected option IDs (for choice-based questions)' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  selectedOptionIds?: string[];

  @ApiPropertyOptional({ description: 'Text answer (for SHORT_TEXT questions)' })
  @IsOptional()
  @IsString()
  textAnswer?: string;
}

export class SubmitAttemptDto {
  @ApiProperty({ type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}
