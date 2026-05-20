import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '@lms/shared-types';

export class RegisterDto {
  @ApiProperty({
    example: 'student1@know.mn',
    description: 'Unique email address used for login.',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Student!1234',
    minLength: 8,
    description:
      'At least 8 chars with uppercase, lowercase, number, and special char',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.STUDENT,
    description: 'Optional role. Public registration normally creates STUDENT accounts.',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
