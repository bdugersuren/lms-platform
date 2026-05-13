import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WebhookService } from './webhook.service';

@ApiTags('Webhooks')
@Controller({ path: 'webhooks', version: '1' })
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('qpay/:paymentId')
  @ApiOperation({ summary: 'QPay payment callback' })
  @ApiParam({ name: 'paymentId', type: 'string' })
  async qpayCallback(
    @Param('paymentId') paymentId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    const data = await this.webhookService.handleQPay(paymentId, payload);
    return ApiResponseBuilder.success(data);
  }

  @Post('socialpay')
  @ApiOperation({ summary: 'SocialPay payment callback' })
  async socialPayCallback(@Body() payload: Record<string, unknown>) {
    const data = await this.webhookService.handleSocialPay(payload);
    return ApiResponseBuilder.success(data);
  }

  @Post('simulate/:paymentId')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[DEV] Simulate payment completion' })
  @ApiParam({ name: 'paymentId', type: 'string' })
  async simulate(@Param('paymentId') paymentId: string) {
    const data = await this.webhookService.simulateComplete(paymentId);
    return ApiResponseBuilder.success(data, 'Payment simulated as completed');
  }
}
