import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WebhookService } from './webhook.service';

interface JwtUser { sub: string; email: string; role: string }

@Injectable()
class AdminOrDevGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    if (process.env.NODE_ENV !== 'production') return true;
    const req = ctx.switchToHttp().getRequest();
    const user: JwtUser | undefined = req.user;
    if (!user) throw new ForbiddenException('Authentication required');
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}

@ApiTags('Webhooks')
@Controller('webhooks')
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
  @UseGuards(JwtAuthGuard, AdminOrDevGuard)
  @ApiOperation({ summary: '[DEV/ADMIN] Simulate payment completion' })
  @ApiParam({ name: 'paymentId', type: 'string' })
  async simulate(
    @CurrentUser() _user: JwtUser,
    @Param('paymentId') paymentId: string,
  ) {
    const data = await this.webhookService.simulateComplete(paymentId);
    return ApiResponseBuilder.success(data, 'Payment simulated as completed');
  }

  @Post('mock-pay/:paymentId')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminOrDevGuard)
  @ApiOperation({ summary: '[DEV/ADMIN] Instantly complete a MOCK provider payment' })
  @ApiParam({ name: 'paymentId', type: 'string' })
  async mockPay(
    @CurrentUser() _user: JwtUser,
    @Param('paymentId') paymentId: string,
  ) {
    try {
      const data = await this.webhookService.mockPay(paymentId);
      return ApiResponseBuilder.success(data, 'Mock payment completed');
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'Payment not found') throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }
}
