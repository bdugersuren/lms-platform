import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnswerItemDto {
  @ApiProperty({ description: 'Question ID' })
  @IsString()
  questionId!: string;

  @ApiPropertyOptional({ description: 'Free-text answer' })
  @IsOptional()
  @IsString()
  answerText?: string;

  @ApiPropertyOptional({ description: 'Selected option IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedOptionIds?: string[];
}

export class SubmitBlockAnswersDto {
  @ApiProperty({ type: [AnswerItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers!: AnswerItemDto[];
}
