import { Module } from '@nestjs/common';
import { GradeController } from './grade.controller';
import { GradeService } from './grade.service';
import { SubmissionModule } from '../submission/submission.module';

@Module({
  imports: [SubmissionModule],
  controllers: [GradeController],
  providers: [GradeService],
})
export class GradeModule {}
