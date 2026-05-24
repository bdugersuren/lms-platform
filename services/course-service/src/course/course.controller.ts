import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@lms/shared-auth';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseQueryDto } from './dto/course-query.dto';

@ApiTags('Courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new course' })
  create(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    return this.courseService.create(dto, user, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List courses with filters' })
  findAll(@Query() query: CourseQueryDto, @Headers('x-tenant-id') tenantId = 'demo') {
    return this.courseService.findAll(query, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID with full curriculum' })
  findOne(@Param('id') id: string, @Headers('x-tenant-id') tenantId = 'demo') {
    return this.courseService.findOne(id, tenantId);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get course by slug' })
  findBySlug(@Param('slug') slug: string, @Headers('x-tenant-id') tenantId = 'demo') {
    return this.courseService.findBySlug(slug, tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update course (owner or admin)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    return this.courseService.update(id, dto, user, tenantId);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Publish a course' })
  publish(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    return this.courseService.publish(id, user, tenantId);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Archive a course' })
  archive(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    return this.courseService.archive(id, user, tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete course (owner or admin)' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    return this.courseService.remove(id, user, tenantId);
  }
}
