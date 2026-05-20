import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnswerItemDto {
  @ApiProperty({ description: 'Question ID' })
  @IsUUID()
  questionId!: string;

  @ApiPropertyOptional({ description: 'Free-text answer' })
  @IsOptional()
  @IsString()
  answerText?: string;

  @ApiPropertyOptional({ description: 'Selected option IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
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
