import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload } from '@lms/shared-types';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { EssayScoreService } from './essay-score.service';
import { ScoreEssayDto } from './dto/score-essay.dto';
import { AiRateLimit } from '../common/guards/ai-rate-limit.decorator';
import { AiRateLimitGuard } from '../common/guards/ai-rate-limit.guard';

@ApiTags('Essay Scoring')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AiRateLimitGuard)
@Controller('ai/essay-score')
export class EssayScoreController {
  constructor(private readonly essayScoreService: EssayScoreService) {}

  @Post()
  @AiRateLimit('ESSAY_SCORE')
  @ApiOperation({ summary: 'Score an essay with AI' })
  async score(@CurrentUser() user: JwtPayload, @Body() dto: ScoreEssayDto) {
    const data = await this.essayScoreService.score(user.sub, dto);
    return ApiResponseBuilder.success(data, 'Essay scored successfully');
  }

  @Get('history')
  @ApiOperation({ summary: 'Get my essay scoring history' })
  async history(@CurrentUser() user: JwtPayload) {
    const data = await this.essayScoreService.getHistory(user.sub);
    return ApiResponseBuilder.success(data);
  }
}
