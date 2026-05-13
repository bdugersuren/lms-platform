import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum PaymentProviderDto {
  QPAY = 'QPAY',
  SOCIAL_PAY = 'SOCIAL_PAY',
}

export class CreatePaymentDto {
  @ApiProperty({ example: 'uuid-of-course' })
  @IsUUID()
  courseId: string;

  @ApiProperty({ example: 99000, description: 'Amount in MNT' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: PaymentProviderDto, example: 'QPAY' })
  @IsEnum(PaymentProviderDto)
  provider: PaymentProviderDto;

  @ApiProperty({ example: 'Course enrollment payment', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiProperty({ example: 'https://myapp.com/payment/result', required: false, description: 'Redirect URL after SocialPay payment' })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
