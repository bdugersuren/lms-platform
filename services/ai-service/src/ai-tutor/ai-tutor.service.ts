import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService, OllamaChatMessage } from '../ollama/ollama.service';
import { CreateSessionDto, SendMessageDto } from './dto/chat.dto';

const TUTOR_SYSTEM_PROMPT = `You are an expert AI tutor for an online learning platform.
Your role is to help students understand course material, answer questions clearly,
provide examples, and guide them through problems step by step.
Be encouraging, patient, and pedagogically effective.
Keep responses concise but complete. Use markdown formatting when helpful.`;

@Injectable()
export class AiTutorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ollama: OllamaService,
  ) {}

  async createSession(userId: string, dto: CreateSessionDto) {
    return this.prisma.chatSession.create({
      data: {
        userId,
        courseId: dto.courseId,
        title: dto.title ?? 'New Chat',
      },
      include: { messages: true },
    });
  }

  async getSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) throw new NotFoundException('Chat session not found');
    return session;
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Chat session not found');
    await this.prisma.chatSession.delete({ where: { id: sessionId } });
  }

  async sendMessage(userId: string, sessionId: string, dto: SendMessageDto) {
    const session = await this.getSession(userId, sessionId);

    await this.prisma.chatMessage.create({
      data: { sessionId, role: 'user', content: dto.content },
    });

    const history: OllamaChatMessage[] = [
      { role: 'system', content: TUTOR_SYSTEM_PROMPT },
      ...session.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: dto.content },
    ];

    const aiReply = await this.ollama.chat(history);

    const assistantMessage = await this.prisma.chatMessage.create({
      data: { sessionId, role: 'assistant', content: aiReply },
    });

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return assistantMessage;
  }
}
