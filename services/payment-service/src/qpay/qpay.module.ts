import { Module } from '@nestjs/common';
import { QPayService } from './qpay.service';

@Module({
  providers: [QPayService],
  exports: [QPayService],
})
export class QPayModule {}
