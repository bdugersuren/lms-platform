import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { ApiResponseBuilder } from '@lms/shared-utils';

interface JwtUser {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @ApiOperation({ summary: 'Enroll in a course' })
  async enroll(@CurrentUser() user: JwtUser, @Body() dto: CreateEnrollmentDto) {
    const data = await this.enrollmentService.enroll(user.sub, dto);
    return ApiResponseBuilder.success(data, 'Enrolled successfully');
  }

  @Get('my')
  @ApiOperation({ summary: 'List my enrollments' })
  async myEnrollments(@CurrentUser() user: JwtUser) {
    const data = await this.enrollmentService.myEnrollments(user.sub);
    return ApiResponseBuilder.success(data);
  }

  @Get('check')
  @ApiOperation({ summary: 'Check if enrolled in a course' })
  @ApiQuery({ name: 'courseId', required: true })
  async checkEnrollment(
    @CurrentUser() user: JwtUser,
    @Query('courseId', ParseUUIDPipe) courseId: string,
  ) {
    const enrolled = await this.enrollmentService.isEnrolled(courseId, user.sub);
    return ApiResponseBuilder.success({ enrolled });
  }

  @Get('by-course/:courseId')
  @ApiOperation({ summary: 'Get enrollment by course ID' })
  async getEnrollmentByCourse(
    @CurrentUser() user: JwtUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    const data = await this.enrollmentService.getEnrollmentByCourse(courseId, user.sub);
    return ApiResponseBuilder.success(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get enrollment by ID' })
  async getEnrollment(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.enrollmentService.getEnrollment(id, user.sub);
    return ApiResponseBuilder.success(data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Unenroll from a course' })
  async unenroll(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.enrollmentService.unenroll(id, user.sub);
    return ApiResponseBuilder.success(null, 'Unenrolled successfully');
  }
}
