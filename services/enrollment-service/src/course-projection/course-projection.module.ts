import { Module } from '@nestjs/common';
import { CourseProjectionService } from './course-projection.service';
import { ProjectionRebuildService } from './projection-rebuild.service';

@Module({
  providers: [CourseProjectionService, ProjectionRebuildService],
  exports: [CourseProjectionService, ProjectionRebuildService],
})
export class CourseProjectionModule {}
