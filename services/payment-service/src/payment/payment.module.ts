import { Module } from '@nestjs/common';
import { QPayModule } from '../qpay/qpay.module';
import { SocialPayModule } from '../socialpay/socialpay.module';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [QPayModule, SocialPayModule],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
