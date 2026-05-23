import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { AttemptService } from './attempt.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

interface JwtUser {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Attempts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('quizzes/:quizId/attempts')
export class AttemptController {
  constructor(private readonly attemptService: AttemptService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new quiz attempt' })
  async start(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @CurrentUser() user: JwtUser,
  ) {
    const data = await this.attemptService.startAttempt(quizId, user.sub);
    return ApiResponseBuilder.success(data, 'Attempt started');
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my attempts for this quiz' })
  async myAttempts(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @CurrentUser() user: JwtUser,
  ) {
    const data = await this.attemptService.getMyAttempts(quizId, user.sub);
    return ApiResponseBuilder.success(data);
  }

  @Get(':attemptId')
  @ApiOperation({ summary: 'Get a specific attempt' })
  async getAttempt(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser() user: JwtUser,
  ) {
    const data = await this.attemptService.getAttempt(quizId, attemptId, user.sub);
    return ApiResponseBuilder.success(data);
  }

  @Post(':attemptId/submit')
  @ApiOperation({ summary: 'Submit answers for an attempt' })
  async submit(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: SubmitAttemptDto,
  ) {
    const data = await this.attemptService.submitAttempt(quizId, attemptId, user.sub, dto);
    return ApiResponseBuilder.success(data, 'Attempt submitted');
  }
}
