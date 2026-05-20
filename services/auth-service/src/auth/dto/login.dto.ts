import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'student1@know.mn',
    description: 'Email address of the user account.',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Student!1234',
    description: 'Plain text password. It is validated by the auth service and never returned.',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  password: string;
}
