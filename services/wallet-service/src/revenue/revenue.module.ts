import { Module } from '@nestjs/common';
import { RevenueController } from './revenue.controller';
import { RevenueService } from './revenue.service';
import { WalletModule } from '../wallet/wallet.module';
import { FeePolicyModule } from '../fee-policy/fee-policy.module';

@Module({
  imports: [WalletModule, FeePolicyModule],
  controllers: [RevenueController],
  providers: [RevenueService],
  exports: [RevenueService],
})
export class RevenueModule {}
