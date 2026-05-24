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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

interface JwtUser {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create payment (COURSE_PURCHASE or WALLET_TOPUP)' })
  async create(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePaymentDto,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.paymentService.create(user.sub, dto, tenantId);
    return ApiResponseBuilder.success(data, 'Payment created');
  }

  @Get('me')
  @ApiOperation({ summary: 'List my payments' })
  async getMyPayments(
    @CurrentUser() user: JwtUser,
    @Query() query: QueryPaymentDto,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.paymentService.findMyPayments(user.sub, query, tenantId);
    return ApiResponseBuilder.success(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID (owner only)' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const data = await this.paymentService.findById(id, user.sub, isAdmin, tenantId);
    return ApiResponseBuilder.success(data);
  }

  @Post(':id/check')
  @ApiOperation({ summary: 'Manually check payment status with provider (owner only)' })
  @ApiParam({ name: 'id', type: 'string' })
  async checkPayment(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.paymentService.checkPayment(id, user.sub, tenantId);
    return ApiResponseBuilder.success(data, `Payment status: ${data.status}`);
  }
}
