import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  controllers: [EnrollmentController, ProgressController],
  providers: [EnrollmentService, ProgressService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
