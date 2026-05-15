import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from '../ollama/ollama.service';
import { ScoreEssayDto } from './dto/score-essay.dto';

export interface RubricBreakdown {
  content: number;
  structure: number;
  language: number;
  arguments: number;
}

interface ScoringResult {
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  rubricBreakdown: RubricBreakdown;
}

@Injectable()
export class EssayScoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ollama: OllamaService,
  ) {}

  async score(userId: string, dto: ScoreEssayDto) {
    const maxScore = dto.maxScore ?? 100;

    const systemPrompt = `You are an expert academic essay evaluator.
Score essays objectively based on: content quality, structure, language use, and argumentation.
Always respond with valid JSON only — no markdown, no explanation outside JSON.`;

    const userPrompt = `Evaluate this essay${dto.prompt ? ` written in response to: "${dto.prompt}"` : ''}.

Essay:
"""
${dto.essayText}
"""

Respond ONLY with this JSON structure:
{
  "score": <number 0-${maxScore}>,
  "rubricBreakdown": {
    "content": <0-25>,
    "structure": <0-25>,
    "language": <0-25>,
    "arguments": <0-25>
  },
  "feedback": "<2-4 sentences of constructive feedback>"
}`;

    const raw = await this.ollama.generate(userPrompt, systemPrompt);

    let parsed: { score: number; rubricBreakdown: RubricBreakdown; feedback: string };
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as typeof parsed;
    } catch {
      parsed = {
        score: maxScore * 0.6,
        rubricBreakdown: { content: 15, structure: 15, language: 15, arguments: 15 },
        feedback: raw.slice(0, 500),
      };
    }

    const result: ScoringResult = {
      score: Math.min(parsed.score, maxScore),
      maxScore,
      percentage: Math.round((Math.min(parsed.score, maxScore) / maxScore) * 100),
      feedback: parsed.feedback,
      rubricBreakdown: parsed.rubricBreakdown,
    };

    const record = await this.prisma.essayScore.create({
      data: {
        userId,
        assignmentId: dto.assignmentId,
        essayText: dto.essayText,
        score: result.score,
        maxScore,
        feedback: result.feedback,
        rubricBreakdown: result.rubricBreakdown as object,
      },
    });

    return { ...record, percentage: result.percentage, rubricBreakdown: result.rubricBreakdown };
  }

  async getHistory(userId: string) {
    return this.prisma.essayScore.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        assignmentId: true,
        score: true,
        maxScore: true,
        feedback: true,
        rubricBreakdown: true,
        createdAt: true,
        essayText: false,
      },
    });
  }
}
