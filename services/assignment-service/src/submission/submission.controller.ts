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
import { SubmissionService } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

interface JwtUser { sub: string; email: string; role: string }

@ApiTags('Submissions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('assignments/:assignmentId/submissions')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post('draft')
  @ApiOperation({ summary: 'Save or update a draft submission' })
  async saveDraft(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateSubmissionDto,
  ) {
    const data = await this.submissionService.upsertDraft(assignmentId, user.sub, dto);
    return ApiResponseBuilder.success(data, 'Draft saved');
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit the draft — finalise submission' })
  async submit(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: JwtUser,
  ) {
    const data = await this.submissionService.submit(assignmentId, user.sub);
    return ApiResponseBuilder.success(data, 'Submitted successfully');
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my submission for this assignment' })
  async mySubmission(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: JwtUser,
  ) {
    const data = await this.submissionService.getMySubmission(assignmentId, user.sub);
    return ApiResponseBuilder.success(data);
  }

  @Get()
  @ApiOperation({ summary: 'List all submissions for an assignment (instructor)' })
  async list(@Param('assignmentId', ParseUUIDPipe) assignmentId: string) {
    const data = await this.submissionService.listByAssignment(assignmentId);
    return ApiResponseBuilder.success(data);
  }

  @Get(':submissionId')
  @ApiOperation({ summary: 'Get a single submission by ID' })
  async getOne(@Param('submissionId', ParseUUIDPipe) submissionId: string) {
    const data = await this.submissionService.getSubmission(submissionId);
    return ApiResponseBuilder.success(data);
  }
}
