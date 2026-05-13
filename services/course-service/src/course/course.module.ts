import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { ModuleController } from './module.controller';
import { ModuleService } from './module.service';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';

@Module({
  controllers: [CourseController, ModuleController, LessonController],
  providers: [CourseService, ModuleService, LessonService],
  exports: [CourseService],
})
export class CourseModule {}
