import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEnrollmentDto {
  @ApiProperty({ description: 'Course ID to enroll in' })
  @IsUUID()
  courseId!: string;
}
