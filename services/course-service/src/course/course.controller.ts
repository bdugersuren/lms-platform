import {
  Body,
  Controller,
  Delete,
  Get,
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
  create(@Body() dto: CreateCourseDto, @CurrentUser() user: JwtPayload) {
    return this.courseService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List courses with filters' })
  findAll(@Query() query: CourseQueryDto) {
    return this.courseService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID with full curriculum' })
  findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get course by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.courseService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update course (owner or admin)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courseService.update(id, dto, user);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Publish a course' })
  publish(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.courseService.publish(id, user);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Archive a course' })
  archive(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.courseService.archive(id, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete course (owner or admin)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.courseService.remove(id, user);
  }
}
