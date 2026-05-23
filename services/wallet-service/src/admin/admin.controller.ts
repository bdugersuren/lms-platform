import {
  Controller,
  Get,
  Param,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@lms/shared-auth';
import { EventFailureService } from '../event-failure/event-failure.service';
import { OutboxService } from '../outbox/outbox.service';
import { ApiResponseBuilder } from '@lms/shared-utils';

@ApiTags('Admin — Wallet Service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly eventFailure: EventFailureService,
    private readonly outbox: OutboxService,
  ) {}

  @Get('events/failures')
  @ApiOperation({ summary: 'List unresolved event failures' })
  async listFailures() {
    const items = await this.eventFailure.listUnresolved();
    return ApiResponseBuilder.success(items, 'Event failures');
  }

  @Post('events/failures/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an event failure as resolved' })
  async resolveFailure(@Param('id') id: string) {
    const updated = await this.eventFailure.markResolved(id);
    return ApiResponseBuilder.success(updated, 'Failure resolved');
  }

  @Post('events/replay/:outboxId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replay a specific outbox event by ID' })
  async replayEvent(@Param('outboxId') outboxId: string) {
    await this.outbox.replayEvent(outboxId);
    return ApiResponseBuilder.success(null, 'Event replayed');
  }
}
