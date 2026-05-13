import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProgressService } from './progress.service';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
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

  @Get()
  @ApiOperation({ summary: 'Get full progress for an enrollment' })
  async getProgress(
    @CurrentUser() user: JwtUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ) {
    const data = await this.progressService.getProgress(enrollmentId, user.sub);
    return ApiResponseBuilder.success(data);
  }

  @Patch(':lessonId')
  @ApiOperation({ summary: 'Update lesson progress (percent / score)' })
  async updateLessonProgress(
    @CurrentUser() user: JwtUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonProgressDto,
  ) {
    const data = await this.progressService.updateLessonProgress(
      enrollmentId,
      lessonId,
      user.sub,
      dto,
    );
    return ApiResponseBuilder.success(data);
  }

  @Post(':lessonId/complete')
  @ApiOperation({ summary: 'Mark a lesson as completed' })
  async completeLesson(
    @CurrentUser() user: JwtUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    const data = await this.progressService.completeLesson(
      enrollmentId,
      lessonId,
      user.sub,
    );
    return ApiResponseBuilder.success(data, 'Lesson completed');
  }
}
