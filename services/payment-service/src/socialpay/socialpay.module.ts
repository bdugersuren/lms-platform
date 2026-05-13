import { Module } from '@nestjs/common';
import { SocialPayService } from './socialpay.service';

@Module({
  providers: [SocialPayService],
  exports: [SocialPayService],
})
export class SocialPayModule {}
