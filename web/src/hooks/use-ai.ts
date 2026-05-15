import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ChatSession,
  ChatMessage,
  CreateSessionDto,
  SendMessageDto,
  EssayScore,
  ScoreEssayDto,
  Recommendation,
} from '@/types/ai';

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── AI Tutor ────────────────────────────────────────────────────────────────

export function useChatSessions() {
  return useQuery<ChatSession[]>({
    queryKey: ['ai-sessions'],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<ChatSession[]>>('/ai/tutor/sessions');
      return data.data;
    },
  });
}

export function useChatSession(sessionId: string) {
  return useQuery<ChatSession>({
    queryKey: ['ai-session', sessionId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<ChatSession>>(`/ai/tutor/sessions/${sessionId}`);
      return data.data;
    },
    enabled: !!sessionId,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation<ChatSession, Error, CreateSessionDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<ApiSuccess<ChatSession>>('/ai/tutor/sessions', dto);
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai-sessions'] });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (sessionId) => {
      await api.delete(`/ai/tutor/sessions/${sessionId}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai-sessions'] });
    },
  });
}

export function useSendMessage(sessionId: string) {
  const qc = useQueryClient();
  return useMutation<ChatMessage, Error, SendMessageDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<ApiSuccess<ChatMessage>>(
        `/ai/tutor/sessions/${sessionId}/messages`,
        dto,
      );
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai-session', sessionId] });
    },
  });
}

// ─── Essay Scoring ────────────────────────────────────────────────────────────

export function useScoreEssay() {
  return useMutation<EssayScore, Error, ScoreEssayDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<ApiSuccess<EssayScore>>('/ai/essay-score', dto);
      return data.data;
    },
  });
}

export function useEssayHistory() {
  return useQuery<EssayScore[]>({
    queryKey: ['essay-history'],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<EssayScore[]>>('/ai/essay-score/history');
      return data.data;
    },
  });
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export function useRecommendations() {
  return useMutation<Recommendation[], Error, { enrolledCourseIds: string[]; enrolledCourseTitles: string[] }>({
    mutationFn: async (dto) => {
      const { data } = await api.post<ApiSuccess<Recommendation[]>>('/ai/recommendations', dto);
      return data.data;
    },
  });
}
