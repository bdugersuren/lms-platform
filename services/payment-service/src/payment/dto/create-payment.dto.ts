import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

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

  @ApiProperty({ example: 'uuid-of-course', required: false, description: 'COURSE_PURCHASE үед заавал' })
  @ValidateIf((o) => o.purpose !== PaymentPurposeDto.WALLET_TOPUP)
  @IsUUID()
  courseId?: string;

  @ApiProperty({ example: 99000, description: 'Amount in MNT' })
  @IsNumber()
  @Min(1000)
  amount: number;

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
