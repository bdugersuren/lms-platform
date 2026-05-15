import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

interface JwtUser { sub: string; email: string; role: string }

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create payment (QPay or SocialPay)' })
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreatePaymentDto) {
    const data = await this.paymentService.create(user.sub, dto);
    return ApiResponseBuilder.success(data, 'Payment created');
  }

  @Get('me')
  @ApiOperation({ summary: 'List my payments' })
  async getMyPayments(@CurrentUser() user: JwtUser, @Query() query: QueryPaymentDto) {
    const data = await this.paymentService.findMyPayments(user.sub, query);
    return ApiResponseBuilder.success(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.paymentService.findById(id);
    return ApiResponseBuilder.success(data);
  }

  @Post(':id/check')
  @ApiOperation({ summary: 'Manually check payment status with provider' })
  @ApiParam({ name: 'id', type: 'string' })
  async checkPayment(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.paymentService.checkPayment(id);
    return ApiResponseBuilder.success(data, `Payment status: ${data.status}`);
  }
}
