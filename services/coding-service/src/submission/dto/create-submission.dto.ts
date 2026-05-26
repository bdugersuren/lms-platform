import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({ description: 'DMOJ language code (e.g. "CPP17", "PY3", "JAVA")' })
  @IsString()
  language: string;

  @ApiProperty({ description: 'Source code' })
  @IsString()
  @MinLength(1)
  code: string;
}
