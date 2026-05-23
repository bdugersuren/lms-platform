import { Module } from '@nestjs/common';
import { EssayScoreController } from './essay-score.controller';
import { EssayScoreService } from './essay-score.service';
import { RubricController } from './rubric.controller';
import { RubricService } from './rubric.service';

@Module({
  controllers: [EssayScoreController, RubricController],
  providers: [EssayScoreService, RubricService],
})
export class EssayScoreModule {}
