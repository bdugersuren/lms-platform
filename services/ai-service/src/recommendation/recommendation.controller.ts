import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload } from '@lms/shared-types';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { RecommendationService } from './recommendation.service';
import { GetRecommendationsDto } from './dto/recommend.dto';
import { AiRateLimit } from '../common/guards/ai-rate-limit.decorator';
import { AiRateLimitGuard } from '../common/guards/ai-rate-limit.guard';

@ApiTags('Recommendations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AiRateLimitGuard)
@Controller('ai/recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Post()
  @AiRateLimit('RECOMMENDATION')
  @ApiOperation({ summary: 'Get AI-powered course recommendations' })
  async recommend(@CurrentUser() user: JwtPayload, @Body() dto: GetRecommendationsDto) {
    const data = await this.recommendationService.getRecommendations(user.sub, dto);
    return ApiResponseBuilder.success(data);
  }
}
