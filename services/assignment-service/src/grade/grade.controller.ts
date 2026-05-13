import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GradeService } from './grade.service';
import { CreateGradeDto } from './dto/create-grade.dto';

interface JwtUser { sub: string; email: string; role: string }

@ApiTags('Grades')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class GradeController {
  constructor(private readonly gradeService: GradeService) {}

  @Post(':submissionId/grade')
  @ApiOperation({ summary: 'Grade a submission (instructor)' })
  async grade(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateGradeDto,
  ) {
    const data = await this.gradeService.grade(submissionId, user.sub, dto);
    return ApiResponseBuilder.success(data, 'Submission graded');
  }

  @Get(':submissionId/grade')
  @ApiOperation({ summary: 'Get grade for a submission' })
  async getGrade(@Param('submissionId', ParseUUIDPipe) submissionId: string) {
    const data = await this.gradeService.getGrade(submissionId);
    return ApiResponseBuilder.success(data);
  }

  @Post(':submissionId/return')
  @ApiOperation({ summary: 'Return submission for revision' })
  async returnSubmission(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body('feedback') feedback: string,
  ) {
    const data = await this.gradeService.returnSubmission(submissionId, feedback);
    return ApiResponseBuilder.success(data, 'Submission returned');
  }
}
