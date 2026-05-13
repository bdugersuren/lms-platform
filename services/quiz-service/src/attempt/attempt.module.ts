import { Module } from '@nestjs/common';
import { AttemptController } from './attempt.controller';
import { AttemptService } from './attempt.service';
import { QuizModule } from '../quiz/quiz.module';

@Module({
  imports: [QuizModule],
  controllers: [AttemptController],
  providers: [AttemptService],
})
export class AttemptModule {}
