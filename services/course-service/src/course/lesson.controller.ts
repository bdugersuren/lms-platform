import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { JwtPayload } from '@lms/shared-types';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';

@ApiTags('Lessons')
@Controller('courses/:courseId/modules/:moduleId/lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add a lesson to a module' })
  create(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lessonService.create(courseId, moduleId, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lessons in a module' })
  findAll(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.lessonService.findByModule(courseId, moduleId);
  }

  @Get(':lessonId')
  @ApiOperation({ summary: 'Get a single lesson' })
  findOne(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.lessonService.findOne(courseId, moduleId, lessonId);
  }

  @Patch(':lessonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a lesson' })
  update(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: Partial<CreateLessonDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lessonService.update(courseId, moduleId, lessonId, dto, user);
  }

  @Delete(':lessonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a lesson' })
  remove(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lessonService.remove(courseId, moduleId, lessonId, user);
  }
}
