import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { SocialPayModule } from '../socialpay/socialpay.module';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [PaymentModule, SocialPayModule],
  providers: [WebhookService],
  controllers: [WebhookController],
})
export class WebhookModule {}
