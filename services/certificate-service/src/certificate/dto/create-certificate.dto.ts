import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCertificateDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'Certificate of Completion' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  recipientName: string;

  @ApiPropertyOptional({ example: 'course-uuid' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ example: 'Advanced Web Development' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'LMS Platform' })
  @IsOptional()
  @IsString()
  issuerName?: string;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  @IsDateString()
  completedAt: string;

  @ApiPropertyOptional({ example: '2027-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
