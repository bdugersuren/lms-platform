import {
  Controller,
  Get,
  Param,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@lms/shared-auth';
import { ProjectionRebuildService } from '../course-projection/projection-rebuild.service';
import { MigrationService } from './migration.service';
import { EventFailureService } from '../event-failure/event-failure.service';
import { OutboxService } from '../outbox/outbox.service';
import { ApiResponseBuilder } from '@lms/shared-utils';

@ApiTags('Admin — Enrollment Service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly rebuild: ProjectionRebuildService,
    private readonly migration: MigrationService,
    private readonly eventFailure: EventFailureService,
    private readonly outbox: OutboxService,
  ) {}

  // ─── Projection endpoints ────────────────────────────────────────────────

  @Get('projections/status')
  @ApiOperation({ summary: 'Course projection table statistics' })
  async projectionStatus() {
    const stats = await this.rebuild.getProjectionStats();
    return ApiResponseBuilder.success(stats, 'Projection stats');
  }

  @Post('projections/rebuild')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger full projection rebuild from course-service' })
  async rebuildProjections() {
    this.logger.log('Admin triggered projection rebuild');
    const result = await this.rebuild.rebuildAll();
    return ApiResponseBuilder.success(result, 'Projection rebuild complete');
  }

  // ─── Migration endpoints ─────────────────────────────────────────────────

  @Get('migrations/runs')
  @ApiOperation({ summary: 'List recent migration runs' })
  async migrationRuns() {
    const runs = await this.migration.listRuns();
    return ApiResponseBuilder.success(runs, 'Migration runs');
  }

  @Get('migrations/reconcile')
  @ApiOperation({ summary: 'Reconciliation report: enrollment-service vs course-service data parity' })
  async reconcile() {
    const report = await this.migration.reconcileReport();
    return ApiResponseBuilder.success(report, 'Reconciliation report');
  }

  @Get('migrations/aliases')
  @ApiOperation({ summary: 'Enrollment alias mapping statistics' })
  async aliasStats() {
    const stats = await this.migration.getAliasStats();
    return ApiResponseBuilder.success(stats, 'Alias stats');
  }

  // ─── Event observability ─────────────────────────────────────────────────

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
