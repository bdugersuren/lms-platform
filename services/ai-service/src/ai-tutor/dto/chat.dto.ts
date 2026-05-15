import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateSessionDto {
  @ApiPropertyOptional({ description: 'Course context for the session' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'User message to the AI tutor' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}
