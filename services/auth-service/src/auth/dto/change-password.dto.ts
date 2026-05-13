import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldP@ssw0rd!' })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty({
    example: 'NewP@ssw0rd!',
    description: 'At least 8 chars with uppercase, lowercase, number, and special char',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}
