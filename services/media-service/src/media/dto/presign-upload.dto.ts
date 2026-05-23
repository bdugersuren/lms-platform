import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString, MaxLength } from 'class-validator';

export class PresignUploadDto {
  @ApiProperty({ example: 'lecture.mp4', description: 'Original filename including extension' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @ApiProperty({ example: 'video/mp4', description: 'MIME type of the file' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ example: 10485760, description: 'File size in bytes' })
  @IsNumber()
  @IsPositive()
  size: number;
}
