import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@lms/shared-auth';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { SubmissionService } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { Request as ExpressRequest } from 'express';

@ApiTags('Coding')
@ApiBearerAuth('access-token')
@Controller('coding')
export class SubmissionController {
  constructor(private readonly submissions: SubmissionService) {}

  @Post('assignments/:assignmentId/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit code to DMOJ judge' })
  async submitCode(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: JwtPayload,
    @Request() req: ExpressRequest,
  ) {
    const token = (req.headers['authorization'] ?? '').replace('Bearer ', '');
    return this.submissions.submit(
      assignmentId,
      dto,
      user.sub,
      user.activeTenantId ?? 'demo',
      token,
    );
  }

  @Get('assignments/:assignmentId/submissions/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my submission history for an assignment' })
  getMySubmissions(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.submissions.getMySubmissions(assignmentId, user.sub);
  }

  @Get('submissions/:submissionId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get submission detail with testcase results' })
  getSubmission(
    @Param('submissionId') submissionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.submissions.getSubmission(submissionId, user.sub);
  }

  @Get('assignments/:assignmentId/submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: '[Instructor] Get all submissions for an assignment' })
  getAllSubmissions(@Param('assignmentId') assignmentId: string) {
    return this.submissions.getAllSubmissions(assignmentId);
  }
}
