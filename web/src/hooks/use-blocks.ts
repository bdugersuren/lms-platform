import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  InteractiveBlock,
  InteractiveQuestion,
  InteractiveQuestionOption,
  InteractiveBlockType,
  QuestionType,
} from '@/types/course';

// ─── Blocks ──────────────────────────────────────────────────────────────────

export function useInteractiveBlocks(lessonId: string) {
  return useQuery<{ success: boolean; data: InteractiveBlock[]; message: string }>({
    queryKey: ['blocks', lessonId],
    queryFn: async () => {
      const { data } = await api.get(`/courses/lessons/${lessonId}/blocks`);
      return data;
    },
    enabled: !!lessonId,
  });
}

export function useCreateBlock(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: InteractiveBlock },
    Error,
    {
      blockType: InteractiveBlockType;
      title?: string | null;
      sortOrder?: number;
      triggerSecond?: number | null;
      triggerPage?: number | null;
      triggerParagraph?: number | null;
      isRequired?: boolean;
      passingScore?: number | null;
      unlockNextContent?: boolean;
      continueOnPassOnly?: boolean;
      contentJson?: Record<string, unknown>;
    }
  >({
    mutationFn: async (dto) => {
      const { data } = await api.post(`/courses/lessons/${lessonId}/blocks`, dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocks', lessonId] });
    },
  });
}

export function useUpdateBlock(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: InteractiveBlock },
    Error,
    {
      blockId: string;
      dto: Partial<{
        blockType: InteractiveBlockType;
        title: string | null;
        sortOrder: number;
        triggerSecond: number | null;
        triggerPage: number | null;
        triggerParagraph: number | null;
        isRequired: boolean;
        passingScore: number | null;
        unlockNextContent: boolean;
        continueOnPassOnly: boolean;
        contentJson: Record<string, unknown>;
      }>;
    }
  >({
    mutationFn: async ({ blockId, dto }) => {
      const { data } = await api.patch(`/courses/blocks/${blockId}`, dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocks', lessonId] });
    },
  });
}

export function useDeleteBlock(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; data: null }, Error, string>({
    mutationFn: async (blockId) => {
      const { data } = await api.delete(`/courses/blocks/${blockId}`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocks', lessonId] });
    },
  });
}

// ─── Questions ───────────────────────────────────────────────────────────────

export function useCreateQuestion(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: InteractiveQuestion },
    Error,
    {
      blockId: string;
      dto: {
        questionType: QuestionType;
        questionText: string;
        explanation?: string | null;
        score?: number;
        sortOrder?: number;
      };
    }
  >({
    mutationFn: async ({ blockId, dto }) => {
      const { data } = await api.post(`/courses/blocks/${blockId}/questions`, dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocks', lessonId] });
    },
  });
}

export function useUpdateQuestion(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: InteractiveQuestion },
    Error,
    {
      questionId: string;
      dto: Partial<{
        questionType: QuestionType;
        questionText: string;
        explanation: string | null;
        score: number;
        sortOrder: number;
      }>;
    }
  >({
    mutationFn: async ({ questionId, dto }) => {
      const { data } = await api.patch(`/courses/questions/${questionId}`, dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocks', lessonId] });
    },
  });
}

export function useDeleteQuestion(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; data: null }, Error, string>({
    mutationFn: async (questionId) => {
      const { data } = await api.delete(`/courses/questions/${questionId}`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocks', lessonId] });
    },
  });
}

// ─── Options ─────────────────────────────────────────────────────────────────

export function useCreateOption(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: InteractiveQuestionOption },
    Error,
    {
      questionId: string;
      dto: { optionText: string; isCorrect?: boolean; sortOrder?: number };
    }
  >({
    mutationFn: async ({ questionId, dto }) => {
      const { data } = await api.post(`/courses/questions/${questionId}/options`, dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocks', lessonId] });
    },
  });
}

export function useUpdateOption(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: InteractiveQuestionOption },
    Error,
    {
      optionId: string;
      dto: Partial<{ optionText: string; isCorrect: boolean; sortOrder: number }>;
    }
  >({
    mutationFn: async ({ optionId, dto }) => {
      const { data } = await api.patch(`/courses/options/${optionId}`, dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocks', lessonId] });
    },
  });
}

export function useDeleteOption(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; data: null }, Error, string>({
    mutationFn: async (optionId) => {
      const { data } = await api.delete(`/courses/options/${optionId}`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocks', lessonId] });
    },
  });
}
