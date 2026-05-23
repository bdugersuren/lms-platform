import { Module } from '@nestjs/common';
import { WalletController, WalletInternalController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  controllers: [WalletController, WalletInternalController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
