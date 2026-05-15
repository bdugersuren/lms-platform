import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload } from '@lms/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RecommendationService } from './recommendation.service';
import { GetRecommendationsDto } from './dto/recommend.dto';

@ApiTags('Recommendations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('ai/recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Post()
  @ApiOperation({ summary: 'Get AI-powered course recommendations' })
  async recommend(@CurrentUser() user: JwtPayload, @Body() dto: GetRecommendationsDto) {
    const data = await this.recommendationService.getRecommendations(user.sub, dto);
    return ApiResponseBuilder.success(data);
  }
}
