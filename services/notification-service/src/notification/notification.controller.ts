import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload } from '@lms/shared-types';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto, UpdatePreferencesDto } from './dto/query-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ─── Internal: create a notification directly (service-to-service via gateway) ─

  @Post()
  @ApiOperation({ summary: 'Create a notification (internal / admin)' })
  async create(@Body() dto: CreateNotificationDto) {
    const data = await this.notificationService.create(dto);
    return ApiResponseBuilder.success(data, 'Notification created');
  }

  // ─── User-facing ──────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List my in-app notifications' })
  async findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryNotificationDto) {
    const data = await this.notificationService.findAll(user.sub, query);
    return ApiResponseBuilder.success(data);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get my unread notification count' })
  async unreadCount(@CurrentUser() user: JwtPayload) {
    const data = await this.notificationService.getUnreadCount(user.sub);
    return ApiResponseBuilder.success(data);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.notificationService.markRead(user.sub, id);
    return ApiResponseBuilder.success(data);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: JwtPayload) {
    const data = await this.notificationService.markAllRead(user.sub);
    return ApiResponseBuilder.success(data, 'All notifications marked as read');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  async remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.notificationService.remove(user.sub, id);
  }

  // ─── Preferences ──────────────────────────────────────────────────────────

  @Get('preferences')
  @ApiOperation({ summary: 'Get my notification preferences' })
  async getPreferences(@CurrentUser() user: JwtPayload) {
    const data = await this.notificationService.getOrCreatePreferences(user.sub);
    return ApiResponseBuilder.success(data);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update my notification preferences' })
  async updatePreferences(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePreferencesDto) {
    const data = await this.notificationService.updatePreferences(user.sub, dto);
    return ApiResponseBuilder.success(data, 'Preferences updated');
  }
}
