import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { AssignmentHttpService } from './assignment-http.service';
import { CodingModule } from '../coding/coding.module';

@Module({
  imports: [HttpModule, CodingModule],
  controllers: [SubmissionController],
  providers: [SubmissionService, AssignmentHttpService],
})
export class SubmissionModule {}
