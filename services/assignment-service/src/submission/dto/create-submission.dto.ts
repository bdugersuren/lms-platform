import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateSubmissionDto {
  @ApiPropertyOptional({ description: 'Text content (for TEXT type)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [String], description: 'Uploaded file URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileUrls?: string[];

  @ApiPropertyOptional({ description: 'Link URL (for LINK type)' })
  @IsOptional()
  @IsUrl()
  linkUrl?: string;
}
