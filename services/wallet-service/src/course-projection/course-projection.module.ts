import { Global, Module } from '@nestjs/common';
import { CourseProjectionService } from './course-projection.service';

@Global()
@Module({
  providers: [CourseProjectionService],
  exports: [CourseProjectionService],
})
export class CourseProjectionModule {}
