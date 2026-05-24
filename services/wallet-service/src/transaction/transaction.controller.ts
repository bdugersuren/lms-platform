import { Controller, Get, Headers, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { TransactionService } from './transaction.service';

interface JwtUser {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Transactions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('wallet/transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  @ApiOperation({ summary: 'Get my transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @CurrentUser() user: JwtUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.transactionService.listByOwner(
      user.sub,
      Number(page),
      Number(limit),
      tenantId,
    );
    return ApiResponseBuilder.success(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID (own transactions only)' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.transactionService.findOne(id, user.sub, tenantId);
    return ApiResponseBuilder.success(data);
  }
}
