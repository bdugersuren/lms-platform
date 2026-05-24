import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { normalizeMoneyInput } from '@lms/shared-money';

export enum PaymentProviderDto {
  QPAY = 'QPAY',
  SOCIAL_PAY = 'SOCIAL_PAY',
  MOCK = 'MOCK',
  WALLET = 'WALLET',
}

export enum PaymentPurposeDto {
  COURSE_PURCHASE = 'COURSE_PURCHASE',
  WALLET_TOPUP = 'WALLET_TOPUP',
}

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentPurposeDto, default: 'COURSE_PURCHASE' })
  @IsEnum(PaymentPurposeDto)
  @IsOptional()
  purpose: PaymentPurposeDto = PaymentPurposeDto.COURSE_PURCHASE;

  @ApiProperty({
    example: 'uuid-of-course',
    required: false,
    description: 'COURSE_PURCHASE үед заавал',
  })
  @ValidateIf((o) => o.purpose !== PaymentPurposeDto.WALLET_TOPUP)
  @IsString()
  courseId?: string;

  @ApiProperty({ example: '99000.00', description: 'Amount as decimal string in MNT' })
  @Transform(({ value }) => normalizeMoneyInput(value))
  @IsDecimal({ decimal_digits: '0,2' })
  amount: string;

  @ApiProperty({ enum: PaymentProviderDto, example: 'QPAY' })
  @IsEnum(PaymentProviderDto)
  provider: PaymentProviderDto;

  @ApiProperty({ example: 'Course enrollment payment', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiProperty({ example: 'https://myapp.com/payment/result', required: false })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
