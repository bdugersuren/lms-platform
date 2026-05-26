import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { AssignmentHttpService } from './assignment-http.service';
import { CodingModule } from '../coding/coding.module';
import { OutboxModule } from '../outbox/outbox.module';
import { DmojModule } from '../dmoj/dmoj.module';

@Module({
  imports: [HttpModule, CodingModule, OutboxModule, DmojModule],
  controllers: [SubmissionController],
  providers: [SubmissionService, AssignmentHttpService],
})
export class SubmissionModule {}
