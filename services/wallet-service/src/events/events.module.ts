import { Module } from '@nestjs/common';
import { RevenueModule } from '../revenue/revenue.module';
import { WalletModule } from '../wallet/wallet.module';
import { EventListenerService } from './event-listener.service';

@Module({
  imports: [RevenueModule, WalletModule],
  controllers: [EventListenerService],
})
export class EventListenerModule {}
