import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'Student!1234',
    description: 'Current password for the authenticated user.',
  })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty({
    example: 'NewStudent!1234',
    description: 'At least 8 chars with uppercase, lowercase, number, and special char',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}
