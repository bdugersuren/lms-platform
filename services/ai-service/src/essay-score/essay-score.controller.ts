import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload } from '@lms/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { EssayScoreService } from './essay-score.service';
import { ScoreEssayDto } from './dto/score-essay.dto';

@ApiTags('Essay Scoring')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('ai/essay-score')
export class EssayScoreController {
  constructor(private readonly essayScoreService: EssayScoreService) {}

  @Post()
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
