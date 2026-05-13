import { Module } from '@nestjs/common';
import { InteractiveController } from './interactive.controller';
import { InteractiveService } from './interactive.service';

@Module({
  controllers: [InteractiveController],
  providers: [InteractiveService],
  exports: [InteractiveService],
})
export class InteractiveModule {}
