import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    return this.lessonService.create(courseId, moduleId, dto, user, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lessons in a module' })
  findAll(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    return this.lessonService.findByModule(courseId, moduleId, tenantId);
  }

  @Get(':lessonId')
  @ApiOperation({ summary: 'Get a single lesson' })
  findOne(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Param('lessonId') lessonId: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    return this.lessonService.findOne(courseId, moduleId, lessonId, tenantId);
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
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    return this.lessonService.update(courseId, moduleId, lessonId, dto, user, tenantId);
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
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    return this.lessonService.remove(courseId, moduleId, lessonId, user, tenantId);
  }
}
