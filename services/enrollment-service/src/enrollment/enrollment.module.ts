import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { CourseProjectionModule } from '../course-projection/course-projection.module';

@Module({
  imports: [CourseProjectionModule],
  controllers: [EnrollmentController, ProgressController],
  providers: [EnrollmentService, ProgressService],
  exports: [EnrollmentService, ProgressService],
})
export class EnrollmentModule {}
