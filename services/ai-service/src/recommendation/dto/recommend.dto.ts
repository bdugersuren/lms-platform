import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID, MaxLength } from 'class-validator';

export class GetRecommendationsDto {
  @ApiProperty({ description: 'Course IDs the user is already enrolled in', type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  enrolledCourseIds: string[];

  @ApiProperty({ description: 'Titles / topics of enrolled courses for AI context', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  enrolledCourseTitles: string[];
}
