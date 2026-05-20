import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { ModuleController } from './module.controller';
import { ModuleService } from './module.service';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { CourseEventsPublisher } from './course-events.publisher';

@Module({
  controllers: [CourseController, ModuleController, LessonController],
  providers: [CourseService, ModuleService, LessonService, CourseEventsPublisher],
  exports: [CourseService],
})
export class CourseModule {}
