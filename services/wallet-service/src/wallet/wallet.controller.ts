import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  UseGuards,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { WalletService } from './wallet.service';
import { ConfigService } from '@nestjs/config';

interface JwtUser {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Wallet')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my wallet (creates if not exists)' })
  async getMyWallet(@CurrentUser() user: JwtUser, @Headers('x-tenant-id') tenantId = 'demo') {
    const data = await this.walletService.getOrCreate(user.sub, 'USER', tenantId);
    return ApiResponseBuilder.success(data);
  }

  @Post('me/init')
  @ApiOperation({ summary: 'Initialize wallet for current user' })
  async initWallet(@CurrentUser() user: JwtUser, @Headers('x-tenant-id') tenantId = 'demo') {
    const data = await this.walletService.getOrCreate(user.sub, 'USER', tenantId);
    return ApiResponseBuilder.success(data, 'Wallet ready');
  }

  @Post('dev/topup')
  @ApiOperation({ summary: '[DEV ONLY] Credit funds to own wallet for testing' })
  async devTopup(
    @CurrentUser() user: JwtUser,
    @Body() body: { amount: string | number; description?: string },
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Not available in production');
    }
    if (!body.amount || Number(body.amount) <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    await this.walletService.getOrCreate(user.sub, 'USER', tenantId);
    const data = await this.walletService.credit(
      user.sub,
      body.amount,
      body.description ?? 'Dev топ-ап',
      'CREDIT',
      undefined,
      tenantId,
    );
    return ApiResponseBuilder.success(
      data,
      `₮${Number(body.amount).toLocaleString()} цэнэглэгдлээ`,
    );
  }
}

@ApiTags('Wallet Internal')
@Controller('wallet/internal')
export class WalletInternalController {
  constructor(
    private readonly walletService: WalletService,
    private readonly config: ConfigService,
  ) {}

  @Post('deduct')
  @ApiOperation({ summary: '[Internal] Deduct wallet balance — service-to-service only' })
  async deduct(
    @Headers('x-internal-secret') secret: string,
    @Headers('x-tenant-id') tenantId = 'demo',
    @Body()
    body: { ownerId: string; amount: string | number; description: string; reference?: string },
  ) {
    const expected = this.config.get<string>('INTERNAL_SERVICE_SECRET', 'internal-secret');
    if (secret !== expected) throw new UnauthorizedException('Invalid internal secret');
    if (!body.ownerId || !body.amount || Number(body.amount) <= 0) {
      throw new BadRequestException('ownerId and positive amount required');
    }
    const data = await this.walletService.debit(
      body.ownerId,
      body.amount,
      body.description ?? 'Хэтэвчээр төлбөр',
      'DEBIT',
      body.reference,
      tenantId,
    );
    return ApiResponseBuilder.success(data);
  }
}
