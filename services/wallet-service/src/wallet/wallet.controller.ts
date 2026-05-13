import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WalletService } from './wallet.service';

interface JwtUser { sub: string; email: string; role: string }

@ApiTags('Wallet')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my wallet (creates if not exists)' })
  async getMyWallet(@CurrentUser() user: JwtUser) {
    const data = await this.walletService.getOrCreate(user.sub);
    return ApiResponseBuilder.success(data);
  }

  @Post('me/init')
  @ApiOperation({ summary: 'Initialize wallet for current user' })
  async initWallet(@CurrentUser() user: JwtUser) {
    const data = await this.walletService.getOrCreate(user.sub);
    return ApiResponseBuilder.success(data, 'Wallet ready');
  }
}
