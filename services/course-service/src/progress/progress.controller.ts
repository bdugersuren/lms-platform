import {
  Body,
  Controller,
  Get,
  Header,
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

const DEPRECATION_HEADER = 'true';
const SUNSET_DATE = 'Sat, 01 Jan 2027 00:00:00 GMT';
const PROGRESS_LINK = '</api/enrollments>; rel="successor-version"';

@ApiTags('Progress')
@Controller('enrollments')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post(':enrollmentId/lessons/:lessonId/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[DEPRECATED] Start or unlock a lesson — use enrollment-service' })
  @Header('Deprecation', DEPRECATION_HEADER)
  @Header('Sunset', SUNSET_DATE)
  @Header('Link', PROGRESS_LINK)
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
  @ApiOperation({ summary: '[DEPRECATED] Update lesson progress — use PATCH /api/enrollments/:id/progress/:lessonId' })
  @Header('Deprecation', DEPRECATION_HEADER)
  @Header('Sunset', SUNSET_DATE)
  @Header('Link', PROGRESS_LINK)
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
  @ApiOperation({ summary: '[DEPRECATED] Mark a lesson as complete — use POST /api/enrollments/:id/progress/:lessonId/complete' })
  @Header('Deprecation', DEPRECATION_HEADER)
  @Header('Sunset', SUNSET_DATE)
  @Header('Link', PROGRESS_LINK)
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
  @ApiOperation({ summary: '[DEPRECATED] Submit block answers — use POST /api/enrollments/:id/progress/blocks/:blockProgressId/submit' })
  @Header('Deprecation', DEPRECATION_HEADER)
  @Header('Sunset', SUNSET_DATE)
  @Header('Link', PROGRESS_LINK)
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
