import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateBindingDto {
  @ApiProperty({ description: 'DMOJ problem code (e.g. "helloworld")' })
  @IsString()
  dmojProblemCode: string;

  @ApiPropertyOptional({ description: 'DMOJ contest key (optional)' })
  @IsOptional()
  @IsString()
  dmojContestKey?: string;

  @ApiPropertyOptional({ description: 'Allowed language codes', example: ['CPP17', 'PY3', 'JAVA'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedLanguages?: string[];

  @ApiPropertyOptional({ description: 'Maximum score', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Passing score threshold', default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  passingScore?: number;

  @ApiPropertyOptional({ description: 'Activate binding', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
