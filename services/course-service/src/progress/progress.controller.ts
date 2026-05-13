import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { JwtPayload } from '@lms/shared-types';
import { ProgressService } from './progress.service';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import { SubmitBlockAnswersDto } from './dto/submit-block-answers.dto';

@ApiTags('Progress')
@Controller('enrollments')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post(':enrollmentId/lessons/:lessonId/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Start or unlock a lesson' })
  startLesson(
    @Param('enrollmentId') enrollmentId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.progressService.startLesson(enrollmentId, lessonId, user);
  }

  @Patch(':enrollmentId/lessons/:lessonId/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update lesson progress (progressPercent, score)' })
  updateProgress(
    @Param('enrollmentId') enrollmentId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonProgressDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.progressService.updateLessonProgress(enrollmentId, lessonId, dto, user);
  }

  @Post(':enrollmentId/lessons/:lessonId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Mark a lesson as complete; triggers unlock of next lesson' })
  completeLesson(
    @Param('enrollmentId') enrollmentId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.progressService.completeLesson(enrollmentId, lessonId, user);
  }

  @Post(':enrollmentId/blocks/:blockProgressId/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit answers for an interactive block; evaluate score' })
  submitBlockAnswers(
    @Param('enrollmentId') enrollmentId: string,
    @Param('blockProgressId') blockProgressId: string,
    @Body() dto: SubmitBlockAnswersDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.progressService.submitBlockAnswers(enrollmentId, blockProgressId, dto, user);
  }

  @Get(':enrollmentId/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get full progress for an enrollment' })
  getFullProgress(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.progressService.getFullProgress(enrollmentId, user);
  }
}
