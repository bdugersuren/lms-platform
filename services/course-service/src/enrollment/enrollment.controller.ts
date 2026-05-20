import {
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@lms/shared-auth';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { EnrollmentService } from './enrollment.service';

const DEPRECATION_HEADER = 'true';
const SUNSET_DATE = 'Sat, 01 Jan 2027 00:00:00 GMT';
const ENROLL_LINK = '</api/enrollments>; rel="successor-version"';

@ApiTags('Enrollments')
@Controller()
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post('courses/:courseId/enroll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[DEPRECATED] Enroll the current user in a course — use POST /api/enrollments' })
  @Header('Deprecation', DEPRECATION_HEADER)
  @Header('Sunset', SUNSET_DATE)
  @Header('Link', ENROLL_LINK)
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
  @ApiOperation({ summary: '[DEPRECATED] Unenroll the current user from a course — use DELETE /api/enrollments/by-course/:courseId' })
  @Header('Deprecation', DEPRECATION_HEADER)
  @Header('Sunset', SUNSET_DATE)
  @Header('Link', ENROLL_LINK)
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
