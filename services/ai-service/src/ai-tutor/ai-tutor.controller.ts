import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload } from '@lms/shared-types';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { AiTutorService } from './ai-tutor.service';
import { CreateSessionDto, SendMessageDto } from './dto/chat.dto';
import { AiRateLimit } from '../common/guards/ai-rate-limit.decorator';
import { AiRateLimitGuard } from '../common/guards/ai-rate-limit.guard';

@ApiTags('AI Tutor')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AiRateLimitGuard)
@Controller('ai/tutor')
export class AiTutorController {
  constructor(private readonly tutorService: AiTutorService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new chat session' })
  async createSession(@CurrentUser() user: JwtPayload, @Body() dto: CreateSessionDto) {
    const data = await this.tutorService.createSession(user.sub, dto);
    return ApiResponseBuilder.success(data, 'Session created');
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List my chat sessions' })
  async getSessions(@CurrentUser() user: JwtPayload) {
    const data = await this.tutorService.getSessions(user.sub);
    return ApiResponseBuilder.success(data);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get session with message history' })
  async getSession(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.tutorService.getSession(user.sub, id);
    return ApiResponseBuilder.success(data);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete chat session' })
  async deleteSession(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tutorService.deleteSession(user.sub, id);
  }

  @Post('sessions/:id/messages')
  @AiRateLimit('TUTOR')
  @ApiOperation({ summary: 'Send message and get AI response' })
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    const data = await this.tutorService.sendMessage(user.sub, id, dto);
    return ApiResponseBuilder.success(data);
  }
}
