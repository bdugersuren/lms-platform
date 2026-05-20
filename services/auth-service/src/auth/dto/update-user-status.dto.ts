import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    example: true,
    description: 'Set to false to deactivate the user, or true to reactivate the user.',
  })
  @IsBoolean()
  isActive: boolean;
}
