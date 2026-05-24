import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDecimal, IsOptional, IsString } from 'class-validator';
import { normalizeMoneyInput } from '@lms/shared-money';

export class CreatePayoutDto {
  @ApiProperty({ description: 'Amount to withdraw as decimal string (MNT)', example: '50000.00' })
  @Transform(({ value }) => normalizeMoneyInput(value))
  @IsDecimal({ decimal_digits: '0,2' })
  amount!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
