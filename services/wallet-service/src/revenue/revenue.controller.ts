import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { RevenueService } from './revenue.service';

interface JwtUser {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Revenue')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('wallet/revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get()
  @ApiOperation({ summary: 'Get my revenue share history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @CurrentUser() user: JwtUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.revenueService.listByOwner(
      user.sub,
      Number(page),
      Number(limit),
      tenantId,
    );
    return ApiResponseBuilder.success(data);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get revenue summary (totals)' })
  async summary(@CurrentUser() user: JwtUser, @Headers('x-tenant-id') tenantId = 'demo') {
    const data = await this.revenueService.summary(user.sub, tenantId);
    return ApiResponseBuilder.success(data);
  }
}
