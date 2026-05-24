import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { PayoutService } from './payout.service';
import { CreatePayoutDto } from './dto/create-payout.dto';

interface JwtUser {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Payouts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('wallet/payouts')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Post()
  @ApiOperation({ summary: 'Request a payout (instructor/admin)' })
  async requestPayout(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePayoutDto,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.payoutService.requestPayout(user.sub, dto, tenantId);
    return ApiResponseBuilder.success(data, 'Payout request submitted');
  }

  @Get()
  @ApiOperation({ summary: 'Get my payout history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @CurrentUser() user: JwtUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.payoutService.listMyPayouts(
      user.sub,
      Number(page),
      Number(limit),
      tenantId,
    );
    return ApiResponseBuilder.success(data);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark payout as completed (admin)' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.payoutService.completePayout(id, tenantId);
    return ApiResponseBuilder.success(data, 'Payout completed');
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject payout and refund (admin)' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.payoutService.rejectPayout(id, reason, tenantId);
    return ApiResponseBuilder.success(data, 'Payout rejected and refunded');
  }
}
