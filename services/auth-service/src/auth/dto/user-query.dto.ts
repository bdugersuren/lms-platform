import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { UserRole } from '@lms/shared-types';

export class UserQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    example: 1,
    description: 'Page number for paginated user results.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
    description: 'Number of users returned per page.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.STUDENT,
    description: 'Optional role filter for admin user search.',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
