import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard } from '@lms/shared-auth';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform-wide KPI overview' })
  async overview() {
    const data = await this.service.getOverview();
    return ApiResponseBuilder.success(data);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Daily event time-series for charts' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look back (default 30)' })
  async timeSeries(@Query('days') days?: string) {
    const data = await this.service.getTimeSeries(days ? Math.min(Number(days), 365) : 30);
    return ApiResponseBuilder.success(data);
  }

  @Get('events')
  @ApiOperation({ summary: 'Recent analytics events feed' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  async events(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('eventType') eventType?: string,
  ) {
    const data = await this.service.getRecentEvents(
      limit ? Math.min(Number(limit), 200) : 50,
      offset ? Number(offset) : 0,
      eventType,
    );
    return ApiResponseBuilder.success(data);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Top courses by enrollment count' })
  @ApiQuery({ name: 'limit', required: false })
  async courses(@Query('limit') limit?: string) {
    const data = await this.service.getCourseStats(limit ? Number(limit) : 10);
    return ApiResponseBuilder.success(data);
  }

  @Get('user-activity')
  @ApiOperation({ summary: 'Daily active users over last N days' })
  @ApiQuery({ name: 'days', required: false })
  async userActivity(@Query('days') days?: string) {
    const data = await this.service.getUserActivity(days ? Math.min(Number(days), 365) : 30);
    return ApiResponseBuilder.success(data);
  }

  @Get('event-breakdown')
  @ApiOperation({ summary: 'Count of events grouped by type' })
  async eventBreakdown() {
    const data = await this.service.getEventBreakdown();
    return ApiResponseBuilder.success(data);
  }

  @Get('health/ingestion')
  @ApiOperation({ summary: 'Event ingestion health — recent event count and latest event timestamp' })
  async ingestionHealth() {
    const data = await this.service.getIngestionHealth();
    return ApiResponseBuilder.success(data);
  }
}
