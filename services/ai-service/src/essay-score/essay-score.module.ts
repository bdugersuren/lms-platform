import { Module } from '@nestjs/common';
import { EssayScoreController } from './essay-score.controller';
import { EssayScoreService } from './essay-score.service';

@Module({
  controllers: [EssayScoreController],
  providers: [EssayScoreService],
})
export class EssayScoreModule {}
