import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { ApiResponseBuilder } from '@lms/shared-utils';

interface JwtUser {
  sub: string;
  email: string;
  role: string;
}

function isAdminRole(role: string): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'INSTRUCTOR';
}

@ApiTags('Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @ApiOperation({ summary: 'Enroll in a course' })
  async enroll(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateEnrollmentDto,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.enrollmentService.enroll(user.sub, dto, tenantId);
    return ApiResponseBuilder.success(data, 'Enrolled successfully');
  }

  @Get('my')
  @ApiOperation({ summary: 'List my enrollments' })
  async myEnrollments(@CurrentUser() user: JwtUser, @Headers('x-tenant-id') tenantId = 'demo') {
    const data = await this.enrollmentService.myEnrollments(user.sub, tenantId);
    return ApiResponseBuilder.success(data);
  }

  @Get('check')
  @ApiOperation({ summary: 'Check if enrolled in a course' })
  @ApiQuery({ name: 'courseId', required: true })
  async checkEnrollment(
    @CurrentUser() user: JwtUser,
    @Query('courseId', ParseUUIDPipe) courseId: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const enrolled = await this.enrollmentService.isEnrolled(courseId, user.sub, tenantId);
    return ApiResponseBuilder.success({ enrolled });
  }

  @Get('by-course/:courseId')
  @ApiOperation({ summary: 'Get enrollment by course ID' })
  async getEnrollmentByCourse(
    @CurrentUser() user: JwtUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.enrollmentService.getEnrollmentByCourse(courseId, user.sub, tenantId);
    return ApiResponseBuilder.success(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get enrollment by ID' })
  async getEnrollment(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.enrollmentService.getEnrollment(id, user.sub, tenantId);
    return ApiResponseBuilder.success(data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Unenroll from a course' })
  async unenroll(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    await this.enrollmentService.unenroll(id, user.sub, tenantId);
    return ApiResponseBuilder.success(null, 'Unenrolled successfully');
  }

  // ─── Course-adjacent compat routes (gateway cutover targets) ─────────────

  @Post('by-course/:courseId')
  @ApiOperation({ summary: 'Enroll in a course by course ID (path param)' })
  async enrollByCourse(
    @CurrentUser() user: JwtUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.enrollmentService.enrollByCourse(courseId, user.sub, tenantId);
    return ApiResponseBuilder.success(data, 'Enrolled successfully');
  }

  @Delete('by-course/:courseId')
  @ApiOperation({ summary: 'Unenroll from a course by course ID (path param)' })
  async unenrollByCourse(
    @CurrentUser() user: JwtUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    await this.enrollmentService.unenrollByCourse(courseId, user.sub, tenantId);
    return ApiResponseBuilder.success(null, 'Unenrolled successfully');
  }

  @Get('admin/course/:courseId')
  @ApiOperation({ summary: 'List all enrollments for a course (instructor/admin only)' })
  async listByCourse(
    @CurrentUser() user: JwtUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    if (!isAdminRole(user.role))
      throw new ForbiddenException('Admin or instructor access required');
    const data = await this.enrollmentService.listEnrollmentsForCourse(courseId, tenantId);
    return ApiResponseBuilder.success(data);
  }
}
