import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@lms/shared-auth';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { EnrollmentService } from './enrollment.service';

@ApiTags('Enrollments')
@Controller()
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post('courses/:courseId/enroll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Enroll the current user in a course' })
  enroll(
    @Param('courseId') courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.enrollmentService.enroll(courseId, user);
  }

  @Delete('courses/:courseId/enroll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Unenroll the current user from a course' })
  unenroll(
    @Param('courseId') courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.enrollmentService.unenroll(courseId, user);
  }

  @Get('courses/:courseId/enrollments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all enrollments for a course (instructor/admin)' })
  listEnrollments(
    @Param('courseId') courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.enrollmentService.listEnrollments(courseId, user);
  }

  @Get('enrollments/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get my enrollments with course info' })
  myEnrollments(@CurrentUser() user: JwtPayload) {
    return this.enrollmentService.myEnrollments(user);
  }

  @Get('enrollments/:enrollmentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a specific enrollment with lesson progress summary' })
  getEnrollment(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.enrollmentService.getEnrollment(enrollmentId, user);
  }
}
