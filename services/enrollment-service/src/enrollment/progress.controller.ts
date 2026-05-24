import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { ProgressService } from './progress.service';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import { SubmitBlockAnswersDto } from './dto/submit-block-answers.dto';
import { ApiResponseBuilder } from '@lms/shared-utils';

interface JwtUser {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('enrollments/:enrollmentId/progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post(':lessonId/start')
  @ApiOperation({ summary: 'Start or unlock a lesson' })
  async startLesson(
    @CurrentUser() user: JwtUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.progressService.startLesson(enrollmentId, lessonId, user.sub, tenantId);
    return ApiResponseBuilder.success(data, 'Lesson started');
  }

  @Post(':lessonId/blocks/:interactiveBlockId/submit')
  @ApiOperation({ summary: 'Submit answers for an interactive block within a lesson' })
  async submitBlockAnswersForLesson(
    @CurrentUser() user: JwtUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('interactiveBlockId', ParseUUIDPipe) interactiveBlockId: string,
    @Body() dto: SubmitBlockAnswersDto,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.progressService.submitBlockAnswers(
      enrollmentId,
      lessonId,
      interactiveBlockId,
      dto,
      user.sub,
      tenantId,
    );
    return ApiResponseBuilder.success(data, 'Answers submitted');
  }

  @Get()
  @ApiOperation({ summary: 'Get full progress for an enrollment' })
  async getProgress(
    @CurrentUser() user: JwtUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.progressService.getProgress(enrollmentId, user.sub, tenantId);
    return ApiResponseBuilder.success(data);
  }

  @Patch(':lessonId')
  @ApiOperation({ summary: 'Update lesson progress (percent / score)' })
  async updateLessonProgress(
    @CurrentUser() user: JwtUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonProgressDto,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.progressService.updateLessonProgress(
      enrollmentId,
      lessonId,
      user.sub,
      dto,
      tenantId,
    );
    return ApiResponseBuilder.success(data);
  }

  @Post(':lessonId/complete')
  @ApiOperation({ summary: 'Mark a lesson as completed' })
  async completeLesson(
    @CurrentUser() user: JwtUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.progressService.completeLesson(
      enrollmentId,
      lessonId,
      user.sub,
      tenantId,
    );
    return ApiResponseBuilder.success(data, 'Lesson completed');
  }
}
