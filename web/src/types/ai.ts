export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  courseId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  _count?: { messages: number };
}

export interface CreateSessionDto {
  courseId?: string;
  title?: string;
}

export interface SendMessageDto {
  content: string;
}

export interface RubricBreakdown {
  content: number;
  structure: number;
  language: number;
  arguments: number;
}

export interface EssayScore {
  id: string;
  userId: string;
  assignmentId?: string;
  essayText?: string;
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  rubricBreakdown: RubricBreakdown;
  createdAt: string;
}

export interface ScoreEssayDto {
  essayText: string;
  assignmentId?: string;
  prompt?: string;
  maxScore?: number;
}

export interface Recommendation {
  id: string;
  topic: string;
  reason: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  score: number;
  createdAt: string;
}
