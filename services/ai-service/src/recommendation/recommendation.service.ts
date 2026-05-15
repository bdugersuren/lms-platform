import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from '../ollama/ollama.service';
import { GetRecommendationsDto } from './dto/recommend.dto';

interface RecommendationItem {
  topic: string;
  reason: string;
  skillLevel: string;
}

@Injectable()
export class RecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ollama: OllamaService,
  ) {}

  async getRecommendations(userId: string, dto: GetRecommendationsDto) {
    const systemPrompt = `You are a learning path advisor AI.
Based on a student's current courses, recommend 3-5 next topics they should learn.
Respond ONLY with valid JSON — no markdown.`;

    const userPrompt = `Student is currently taking: ${dto.enrolledCourseTitles.join(', ') || 'no courses yet'}.

Recommend next learning topics. Respond ONLY with:
{
  "recommendations": [
    { "topic": "...", "reason": "...", "skillLevel": "beginner|intermediate|advanced" }
  ]
}`;

    const raw = await this.ollama.generate(userPrompt, systemPrompt);

    let items: RecommendationItem[] = [];
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as { recommendations: RecommendationItem[] };
      items = parsed.recommendations ?? [];
    } catch {
      items = [{ topic: 'Advanced Programming', reason: 'Based on your current studies', skillLevel: 'intermediate' }];
    }

    await this.prisma.recommendation.deleteMany({ where: { userId } });

    const saved = await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.recommendation.create({
          data: {
            userId,
            courseId: `suggested-${item.topic.toLowerCase().replace(/\s+/g, '-')}`,
            reason: `${item.topic} — ${item.reason} (${item.skillLevel})`,
            score: item.skillLevel === 'beginner' ? 0.9 : item.skillLevel === 'intermediate' ? 0.7 : 0.5,
          },
        }),
      ),
    );

    return saved.map((r, i) => ({ ...r, ...items[i] }));
  }
}
