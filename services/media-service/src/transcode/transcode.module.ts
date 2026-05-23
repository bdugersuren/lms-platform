import { Module } from '@nestjs/common';
import { TranscodeController } from './transcode.controller';
import { TranscodeService } from './transcode.service';
import { TranscodeWorkerService } from './transcode-worker.service';

@Module({
  controllers: [TranscodeController],
  providers: [TranscodeService, TranscodeWorkerService],
})
export class TranscodeModule {}
